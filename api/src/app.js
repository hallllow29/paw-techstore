import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env, isProd } from './config/env.js';
import { mountSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // ── Segurança & infraestrutura ──
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (!isProd) app.use(morgan('dev'));

  // Rate limiting global (mitiga abuso/brute-force; ZAP/SAST gostam de ver isto)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // ── Ficheiros estáticos (imagens de produtos, logótipo) ──
  // CORP cross-origin: o cliente (noutra porta/origem) precisa de embeber as imagens.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.join(__dirname, '..', 'uploads'))
  );

  // ── Documentação Swagger ──
  mountSwagger(app);

  // ── Rotas da API ──
  app.use('/api', apiRoutes);

  // ── 404 + tratamento de erros (sempre no fim) ──
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
