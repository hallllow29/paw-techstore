import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/store.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { uploadLogo } from '../middleware/upload.js';

const router = Router();

/**
 * @openapi
 * /api/store:
 *   get:
 *     tags: [Loja]
 *     summary: Configuração da loja (nome, logo, horário, métodos de entrega)
 *     responses:
 *       200: { description: Configuração da loja }
 *   put:
 *     tags: [Loja]
 *     summary: Atualiza a configuração da loja (loja)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Configuração atualizada }
 */
router.get('/', getSettings);
router.put('/', auth, authorize('loja', 'admin'), uploadLogo, updateSettings);

export default router;
