import { Category } from '../models/category.model.js';
import { Product } from '../models/product.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/categories — todas as categorias (público). */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ ativo: true })
    .populate('parent', 'nome slug')
    .sort({ nome: 1 });
  res.json({ success: true, count: categories.length, categories });
});

/** POST /api/categories — cria categoria (loja). */
export const createCategory = asyncHandler(async (req, res) => {
  const { nome, parent } = req.body;
  const category = await Category.create({ nome, parent: parent || null });
  res.status(201).json({ success: true, category });
});

/** PUT /api/categories/:id — atualiza categoria (loja). */
export const updateCategory = asyncHandler(async (req, res) => {
  const { nome, parent, ativo } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Categoria não encontrada');
  }
  if (nome !== undefined) category.nome = nome;
  if (parent !== undefined) category.parent = parent || null;
  if (ativo !== undefined) category.ativo = ativo;
  await category.save();
  res.json({ success: true, category });
});

/** DELETE /api/categories/:id — remove categoria (loja). */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Não deixar apagar categoria com subcategorias ou produtos associados
  if (await Category.exists({ parent: id })) {
    res.status(409);
    throw new Error('A categoria tem subcategorias. Remove-as primeiro.');
  }
  if (await Product.exists({ categoria: id })) {
    res.status(409);
    throw new Error('A categoria tem produtos associados.');
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    res.status(404);
    throw new Error('Categoria não encontrada');
  }
  res.json({ success: true, message: 'Categoria removida' });
});
