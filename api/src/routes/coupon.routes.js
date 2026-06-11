import { Router } from 'express';
import {
  validateCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();
const loja = [auth, authorize('loja', 'admin')];

/**
 * @openapi
 * /api/coupons/validate:
 *   post:
 *     tags: [Cupões]
 *     summary: Valida um cupão para um subtotal (cliente autenticado)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo: { type: string }
 *               subtotal: { type: number }
 *     responses:
 *       200: { description: Cupão válido (devolve desconto) }
 *       422: { description: Cupão inválido para este subtotal }
 */
router.post('/validate', auth, validateCoupon);

/**
 * @openapi
 * /api/coupons:
 *   get:
 *     tags: [Cupões]
 *     summary: Lista cupões (loja)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de cupões }
 *   post:
 *     tags: [Cupões]
 *     summary: Cria um cupão (loja)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Cupão criado }
 */
router.get('/', loja, listCoupons);
router.post('/', loja, createCoupon);
router.put('/:id', loja, updateCoupon);
router.delete('/:id', loja, deleteCoupon);

export default router;
