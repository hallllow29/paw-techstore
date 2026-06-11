import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { Category } from '../models/category.model.js';
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

  // Pesquisa por nome, EAN ou marca (input escapado contra injeção de regex)
  if (req.query.q) {
    // eslint-disable-next-line security/detect-non-literal-regexp -- input escapado por escapeRegex
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ nome: rx }, { ean: rx }, { marca: rx }];
  }

  // Filtro por categoria (inclui descendentes)
  if (req.query.categoria) {
    const ids = await Category.descendantIds(req.query.categoria);
    filter.categoria = { $in: ids };
  }

  // Intervalo de preço
  if (req.query.minPreco || req.query.maxPreco) {
    filter.preco = {};
    if (req.query.minPreco) filter.preco.$gte = Number(req.query.minPreco);
    if (req.query.maxPreco) filter.preco.$lte = Number(req.query.maxPreco);
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

/** GET /api/products/:idOrSlug — detalhe de um produto (público). */
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const product = await Product.findOne(query).populate('categoria', 'nome slug parent');
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

  const categorias = new Set(products.map((p) => String(p.categoria._id)));
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

/** POST /api/products — cria produto (loja). Multipart com imagens. */
export const createProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req);

  if (await Product.exists({ ean: data.ean })) {
    res.status(409);
    throw new Error('Já existe um produto com este EAN');
  }

  const product = await Product.create(data);
  res.status(201).json({ success: true, product });
});

/** PUT /api/products/:id — atualiza produto (loja). */
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }

  const data = parseProductBody(req, { partial: true });
  Object.assign(product, data);
  await product.save();
  res.json({ success: true, product });
});

/** DELETE /api/products/:id — remove produto (loja). */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }
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
