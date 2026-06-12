import { Router } from 'express';
import {
  paymentConfig,
  createCheckout,
  confirmPayment,
  payMbway,
  confirmMultibanco,
  payCartao,
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

/**
 * @openapi
 * /api/payments/mbway/{orderId}:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Pagamento MB WAY (simulado)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Pago }
 */
router.post('/mbway/:orderId', authorize('cliente'), payMbway);

/**
 * @openapi
 * /api/payments/multibanco/{orderId}/confirmar:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Confirma pagamento por Multibanco (simulado)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Pago }
 */
router.post('/multibanco/:orderId/confirmar', authorize('cliente'), confirmMultibanco);

/**
 * @openapi
 * /api/payments/cartao/{orderId}:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Pagamento por cartão (simulado, quando o Stripe não está configurado)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Pago }
 */
router.post('/cartao/:orderId', authorize('cliente'), payCartao);

export default router;
