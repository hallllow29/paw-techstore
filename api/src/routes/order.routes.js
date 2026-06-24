import { Router } from 'express';
import {
  createOrder,
  myOrders,
  cancelOrder,
  listOrders,
  updateStatus,
  availableDeliveries,
  acceptDelivery,
  markDelivered,
  myDeliveries,
  getOrder,
  listCouriers,
  assignDelivery,
  setDisponibilidade,
} from '../controllers/order.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { requireActive } from '../middleware/requireActive.js';

const router = Router();
router.use(auth); // todas as rotas de encomendas exigem login

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Encomendas]
 *     summary: Cria uma encomenda a partir do carrinho (cliente)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metodoEntrega: { type: string, enum: [levantamento_loja, estafeta, transportadora] }
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     produto: { type: string }
 *                     quantidade: { type: integer }
 *     responses:
 *       201: { description: Encomenda criada }
 *       409: { description: Sem stock suficiente }
 *   get:
 *     tags: [Encomendas]
 *     summary: Lista todas as encomendas (loja)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de encomendas }
 */
router.post('/', authorize('cliente'), createOrder);
router.get('/', authorize('loja', 'admin'), listOrders);

// Rotas específicas (antes de /:id)
router.get('/me', authorize('cliente'), myOrders);
router.get(
  '/entregas/disponiveis',
  authorize('estafeta'),
  requireActive,
  availableDeliveries
);
router.get('/entregas/minhas', authorize('estafeta'), myDeliveries);
router.get('/entregas/estafetas', authorize('loja', 'admin'), listCouriers);
router.patch(
  '/entregas/disponibilidade',
  authorize('estafeta'),
  requireActive,
  setDisponibilidade
);

/**
 * @openapi
 * /api/orders/{id}/cancelar:
 *   patch:
 *     tags: [Encomendas]
 *     summary: Cancela uma encomenda (cliente; até 10 min após confirmação)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Encomenda cancelada }
 *       403: { description: Fora da janela de cancelamento }
 */
router.patch('/:id/cancelar', authorize('cliente'), cancelOrder);
router.patch('/:id/estado', authorize('loja', 'admin'), updateStatus);
router.patch('/:id/aceitar', authorize('estafeta'), requireActive, acceptDelivery);
router.patch('/:id/entregue', authorize('estafeta'), requireActive, markDelivered);
router.patch('/:id/atribuir', authorize('loja', 'admin'), assignDelivery);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Encomendas]
 *     summary: Detalhe de uma encomenda (dono, loja ou estafeta atribuído)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Encomenda }
 */
router.get('/:id', getOrder);

export default router;
