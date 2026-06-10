/**
 * Router raiz da API. Cada feature regista o seu próprio router aqui.
 * Montado em /api a partir do app.js.
 *
 * À medida que o projeto cresce (Fase 1+) adicionam-se:
 *   router.use('/auth', authRoutes);
 *   router.use('/products', productRoutes);
 *   ...
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/', healthRoutes);

export default router;
