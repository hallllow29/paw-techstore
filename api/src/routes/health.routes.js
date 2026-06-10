import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Estado da API e da base de dados
 *     responses:
 *       200:
 *         description: Serviço operacional
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    db: states[mongoose.connection.readyState] ?? 'unknown',
  });
});

export default router;
