import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Estatísticas do utilizador conforme o seu perfil
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Estatísticas (cliente, loja, estafeta ou admin) }
 */
router.get('/', auth, getDashboard);

export default router;
