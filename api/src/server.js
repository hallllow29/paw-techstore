/**
 * Ponto de entrada: liga à BD e arranca o servidor HTTP.
 * (A criação da app vive em app.js para ser testável sem abrir porta.)
 */
import http from 'node:http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    await connectDB();
    const app = createApp();
    const server = http.createServer(app);
    initSocket(server); // rastreio em tempo real (Socket.IO)
    server.listen(env.port, () => {
      logger.info(`API a correr em http://localhost:${env.port}`);
      logger.info(`Swagger em http://localhost:${env.port}/api/docs`);
    });

    // Encerramento gracioso (importante em Docker)
    const shutdown = (signal) => {
      logger.warn(`${signal} recebido - a encerrar...`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(`Falha no arranque: ${err.message}`);
    process.exit(1);
  }
}

start();
