import { Router } from 'express';
import { adminStats, lojaAnalytics } from '../controllers/analytics.controller.js';
import { auth, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /api/analytics/admin:
 *   get:
 *     tags: [Analytics]
 *     summary: Observabilidade global da plataforma (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: KPIs, distribuições e séries temporais }
 *       403: { description: Sem permissão }
 */
router.get('/admin', auth, authorize('admin'), adminStats);

/**
 * @openapi
 * /api/analytics/loja:
 *   get:
 *     tags: [Analytics]
 *     summary: Observabilidade da loja (loja/admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Receita, encomendas, top produtos e alertas de stock }
 *       403: { description: Sem permissão }
 */
router.get('/loja', auth, authorize('loja', 'admin'), lojaAnalytics);

export default router;
