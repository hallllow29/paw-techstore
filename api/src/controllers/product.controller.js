import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { Category } from '../models/category.model.js';
import { ProductReview } from '../models/productReview.model.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const SORT_MAP = {
  preco: { preco: 1 },
  '-preco': { preco: -1 },
  nome: { nome: 1 },
  '-nome': { nome: -1 },
  recentes: { createdAt: -1 },
};

/**
 * GET /api/products
 * Pesquisa (?q=), filtro por categoria (?categoria=, inclui subcategorias),
 * intervalo de preço (?minPreco/?maxPreco), ordenação (?sort=) e paginação
 * (?page=&limit=).
 */
export const listProducts = asyncHandler(async (req, res) => {
  const filter = { ativo: true };

  // Pesquisa por nome, EAN ou marca (input escapado e coagido a string -   // ?q=a&q=b chega como array e rebentaria em .trim())
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp -- input escapado por escapeRegex
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ nome: rx }, { ean: rx }, { marca: rx }];
  }

  // Filtro por categoria (inclui descendentes) - só se for um ObjectId válido
  const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : '';
  if (categoria && mongoose.isValidObjectId(categoria)) {
    const ids = await Category.descendantIds(categoria);
    filter.categoria = { $in: ids };
  }

  // Intervalo de preço (ignora valores não numéricos - evita CastError 500)
  const min = req.query.minPreco ? Number(req.query.minPreco) : Number.NaN;
  const max = req.query.maxPreco ? Number(req.query.maxPreco) : Number.NaN;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.preco = {};
    if (Number.isFinite(min)) filter.preco.$gte = min;
    if (Number.isFinite(max)) filter.preco.$lte = max;
  }

  // Marca (exata)
  if (typeof req.query.marca === 'string' && req.query.marca)
    filter.marca = req.query.marca;

  // Apenas produtos com stock
  if (req.query.emStock === 'true' || req.query.emStock === '1') {
    filter.stock = { $gt: 0 };
  }

  const sort = SORT_MAP[req.query.sort] ?? { createdAt: -1 };
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('categoria', 'nome slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/** GET /api/products/marcas - marcas distintas (para os filtros). */
export const listMarcas = asyncHandler(async (_req, res) => {
  const marcas = await Product.distinct('marca', { ativo: true });
  res.json({
    success: true,
    marcas: marcas.filter(Boolean).sort((a, b) => a.localeCompare(b)),
  });
});

/** GET /api/products/:idOrSlug - detalhe de um produto (público). */
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const product = await Product.findOne(query).populate({
    path: 'categoria',
    select: 'nome slug parent',
    populate: { path: 'parent', select: 'nome slug' },
  });
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }
  res.json({ success: true, product });
});

/**
 * GET /api/products/compare?ids=a,b,c
 * Compara até 3 produtos da MESMA categoria e devolve as chaves de atributos
 * alinhadas (união) para a tabela comparativa.
 */
export const compareProducts = asyncHandler(async (req, res) => {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length < 2 || ids.length > 3) {
    res.status(400);
    throw new Error('Indica entre 2 e 3 produtos para comparar');
  }

  const products = await Product.find({ _id: { $in: ids } }).populate(
    'categoria',
    'nome slug'
  );
  if (products.length !== ids.length) {
    res.status(404);
    throw new Error('Um ou mais produtos não existem');
  }

  const categorias = new Set(
    products.map((p) => String(p.categoria?._id ?? p.categoria))
  );
  if (categorias.size > 1) {
    res.status(400);
    throw new Error('Só é possível comparar produtos da mesma categoria');
  }

  // União das chaves de atributos, preservando a ordem de aparecimento
  const attributeKeys = [];
  for (const p of products) {
    for (const key of p.atributos.keys()) {
      if (!attributeKeys.includes(key)) attributeKeys.push(key);
    }
  }

  res.json({ success: true, products, attributeKeys });
});

/** POST /api/products - cria produto (loja). Multipart com imagens. */
export const createProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req);

  if (await Product.exists({ ean: data.ean })) {
    res.status(409);
    throw new Error('Já existe um produto com este EAN');
  }
  await garantirCategoria(data.categoria, res);

  const product = await Product.create(data);
  res.status(201).json({ success: true, product });
});

/** PUT /api/products/:id - atualiza produto (loja). */
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }

  const data = parseProductBody(req, { partial: true });
  if (data.categoria !== undefined) await garantirCategoria(data.categoria, res);
  Object.assign(product, data);
  await product.save();
  res.json({ success: true, product });
});

/** Valida que a categoria existe (evita referências órfãs). */
async function garantirCategoria(categoria, res) {
  const ok =
    mongoose.isValidObjectId(categoria) && (await Category.exists({ _id: categoria }));
  if (!ok) {
    res.status(400);
    throw new Error('Categoria inexistente');
  }
}

/** DELETE /api/products/:id - remove produto (loja). */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }
  // Cascata: remove avaliações do produto e tira-o dos favoritos dos utilizadores
  await ProductReview.deleteMany({ produto: product._id });
  await User.updateMany(
    { favoritos: product._id },
    { $pull: { favoritos: product._id } }
  );
  res.json({ success: true, message: 'Produto removido' });
});

/**
 * Normaliza o corpo do pedido (multipart): campos de texto, atributos (JSON
 * string) e ficheiros de imagem do multer.
 */
function parseProductBody(req, { partial = false } = {}) {
  const b = req.body;
  const data = {};

  const fields = ['ean', 'nome', 'descricao', 'categoria', 'marca'];
  for (const f of fields) {
    // eslint-disable-next-line security/detect-object-injection -- `f` vem de uma allowlist literal
    if (b[f] !== undefined) data[f] = b[f];
  }

  if (b.preco !== undefined) data.preco = Number(b.preco);
  if (b.precoAntigo !== undefined && b.precoAntigo !== '') {
    data.precoAntigo = Number(b.precoAntigo);
  }
  if (b.stock !== undefined) data.stock = Number(b.stock);
  if (b.ativo !== undefined) data.ativo = b.ativo === 'true' || b.ativo === true;

  // atributos chega como JSON string no multipart
  if (b.atributos !== undefined) {
    data.atributos =
      typeof b.atributos === 'string' ? JSON.parse(b.atributos) : b.atributos;
  }

  // Imagens carregadas
  const files = req.files ?? {};
  if (files.imagemDestaque?.[0])
    data.imagemDestaque = toPublicPath(files.imagemDestaque[0]);
  if (files.imagens?.length) data.imagens = files.imagens.map(toPublicPath);

  // Em criação, garante defaults mínimos
  if (!partial && data.imagemDestaque === undefined) data.imagemDestaque = '';

  return data;
}
