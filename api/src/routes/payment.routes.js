import { Router } from 'express';
import {
  paymentConfig,
  createCheckout,
  confirmPayment,
  payMbway,
  confirmMultibanco,
  payCartao,
  payPaypal,
  createPaypalCheckout,
  confirmPaypal,
} from '../controllers/payment.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /api/payments/paypal/confirm:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Captura a ordem PayPal no regresso (público — identificado pelo id da ordem)
 *     responses:
 *       200: { description: "{ pago: boolean, orderId: string }" }
 */
// Pública (sem auth): a aprovação já foi feita pelo comprador no PayPal e a
// captura é idempotente — só finaliza um pagamento já aprovado. Assim funciona
// mesmo que a sessão do cliente não sobreviva ao redirect externo.
router.post('/paypal/confirm', confirmPaypal);

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

/**
 * @openapi
 * /api/payments/paypal/{orderId}/create:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Cria uma ordem PayPal real (sandbox) e devolve a URL de aprovação
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "URL de aprovação PayPal" }
 *       503: { description: PayPal não configurado }
 */
router.post('/paypal/:orderId/create', authorize('cliente'), createPaypalCheckout);

/**
 * @openapi
 * /api/payments/paypal/{orderId}:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Pagamento por PayPal (simulado, quando o PayPal não está configurado)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: orderId, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Pago }
 */
router.post('/paypal/:orderId', authorize('cliente'), payPaypal);

export default router;
