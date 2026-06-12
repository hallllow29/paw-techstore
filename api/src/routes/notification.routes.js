import { Router } from 'express';
import {
  myNotifications,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notificações]
 *     summary: As minhas notificações + nº por ler
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ naoLidas, notifications }" }
 */
router.get('/', myNotifications);

/**
 * @openapi
 * /api/notifications/ler-todas:
 *   patch:
 *     tags: [Notificações]
 *     summary: Marca todas as notificações como lidas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.patch('/ler-todas', markAllRead);

/**
 * @openapi
 * /api/notifications/{id}/lida:
 *   patch:
 *     tags: [Notificações]
 *     summary: Marca uma notificação como lida
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 */
router.patch('/:id/lida', markRead);

export default router;
