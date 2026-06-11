import { Router } from 'express';
import {
  paymentConfig,
  createCheckout,
  confirmPayment,
} from '../controllers/payment.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();
router.use(auth);

/**
 * @openapi
 * /api/payments/config:
 *   get:
 *     tags: [Pagamentos]
 *     summary: Indica se o pagamento online (Stripe) está disponível
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ enabled: boolean }" }
 */
router.get('/config', paymentConfig);

/**
 * @openapi
 * /api/payments/checkout/{orderId}:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Cria uma sessão de Checkout Stripe para uma encomenda (cliente)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "URL de pagamento Stripe" }
 *       503: { description: Pagamento não configurado }
 */
router.post('/checkout/:orderId', authorize('cliente'), createCheckout);

/**
 * @openapi
 * /api/payments/confirm:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Confirma o pagamento de uma sessão (no regresso do Stripe)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ pago: boolean }" }
 */
router.post('/confirm', authorize('cliente'), confirmPayment);

export default router;
