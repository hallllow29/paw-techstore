import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { categoryRules } from '../validators/catalog.validator.js';

const router = Router();
const loja = [auth, authorize('loja', 'admin')];

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categorias]
 *     summary: Lista as categorias
 *     responses:
 *       200: { description: Lista de categorias }
 *   post:
 *     tags: [Categorias]
 *     summary: Cria uma categoria (loja)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome]
 *             properties:
 *               nome: { type: string }
 *               parent: { type: string, nullable: true }
 *     responses:
 *       201: { description: Categoria criada }
 */
router.get('/', listCategories);
router.post('/', loja, categoryRules, validate, createCategory);

/**
 * @openapi
 * /api/categories/{id}:
 *   put:
 *     tags: [Categorias]
 *     summary: Atualiza uma categoria (loja)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Categoria atualizada }
 *   delete:
 *     tags: [Categorias]
 *     summary: Remove uma categoria (loja)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Categoria removida }
 *       409: { description: Tem subcategorias ou produtos }
 */
router.put('/:id', loja, updateCategory);
router.delete('/:id', loja, deleteCategory);

export default router;
