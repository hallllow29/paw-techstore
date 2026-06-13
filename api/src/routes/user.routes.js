import { Router } from 'express';
import {
  listUsers,
  listPendingEstafetas,
  aprovarEstafeta,
  rejeitarEstafeta,
  banUser,
  unbanUser,
} from '../controllers/user.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();

// Todas as rotas de gestão de utilizadores são exclusivas do admin
router.use(auth, authorize('admin'));

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Lista utilizadores (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [cliente, loja, estafeta, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ativo, pendente, rejeitado] }
 *     responses:
 *       200: { description: Lista de utilizadores }
 *       403: { description: Sem permissão }
 */
router.get('/', listUsers);

/**
 * @openapi
 * /api/users/estafetas/pendentes:
 *   get:
 *     tags: [Users]
 *     summary: Estafetas a aguardar aprovação (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de estafetas pendentes }
 */
router.get('/estafetas/pendentes', listPendingEstafetas);

/**
 * @openapi
 * /api/users/{id}/aprovar:
 *   patch:
 *     tags: [Users]
 *     summary: Aprova um estafeta (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Estafeta aprovado }
 *       404: { description: Estafeta não encontrado }
 */
router.patch('/:id/aprovar', aprovarEstafeta);

/**
 * @openapi
 * /api/users/{id}/rejeitar:
 *   patch:
 *     tags: [Users]
 *     summary: Rejeita um estafeta (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Estafeta rejeitado }
 *       404: { description: Estafeta não encontrado }
 */
router.patch('/:id/rejeitar', rejeitarEstafeta);

/**
 * @openapi
 * /api/users/{id}/banir:
 *   patch:
 *     tags: [Users]
 *     summary: Suspende uma conta (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conta suspensa }
 *       403: { description: Não permitido (admin/próprio) }
 *       404: { description: Utilizador não encontrado }
 */
router.patch('/:id/banir', banUser);

/**
 * @openapi
 * /api/users/{id}/desbanir:
 *   patch:
 *     tags: [Users]
 *     summary: Reativa uma conta suspensa (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conta reativada }
 *       404: { description: Utilizador não encontrado }
 */
router.patch('/:id/desbanir', unbanUser);

export default router;
