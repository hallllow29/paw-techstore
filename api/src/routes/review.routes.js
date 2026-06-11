import { Router } from 'express';
import {
  createReview,
  getReviewByOrder,
  listReviews,
} from '../controllers/review.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();
router.use(auth);

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Avaliações]
 *     summary: Avalia uma encomenda entregue (cliente)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, ratingEncomenda]
 *             properties:
 *               orderId: { type: string }
 *               ratingEncomenda: { type: integer, minimum: 1, maximum: 5 }
 *               ratingEstafeta: { type: integer, minimum: 1, maximum: 5 }
 *               comentario: { type: string }
 *     responses:
 *       201: { description: Avaliação criada }
 *       409: { description: Já avaliada ou não entregue }
 *   get:
 *     tags: [Avaliações]
 *     summary: Lista todas as avaliações (loja)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de avaliações }
 */
router.post('/', authorize('cliente'), createReview);
router.get('/', authorize('loja', 'admin'), listReviews);

/**
 * @openapi
 * /api/reviews/order/{orderId}:
 *   get:
 *     tags: [Avaliações]
 *     summary: Avaliação de uma encomenda (ou null se não existir)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Avaliação (ou null) }
 */
router.get('/order/:orderId', getReviewByOrder);

export default router;
