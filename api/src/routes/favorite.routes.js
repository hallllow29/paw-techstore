import { Router } from 'express';
import { listFavorites, toggleFavorite } from '../controllers/favorite.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [Favoritos]
 *     summary: Produtos favoritos do utilizador
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de produtos favoritos }
 */
router.get('/', listFavorites);

/**
 * @openapi
 * /api/favorites/{productId}:
 *   post:
 *     tags: [Favoritos]
 *     summary: Adiciona/remove um produto dos favoritos (toggle)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Lista atualizada de IDs favoritos }
 */
router.post('/:productId', toggleFavorite);

export default router;
