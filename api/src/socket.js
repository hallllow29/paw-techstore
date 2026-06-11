import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.js';
import { Order } from './models/order.model.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

/**
 * Inicializa o Socket.IO para rastreio em tempo real do estafeta.
 * - Cada encomenda tem uma sala `order:<id>`.
 * - O estafeta atribuído emite a sua posição; o servidor retransmite para a
 *   sala (cliente/loja) e persiste a última posição na encomenda.
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Autenticação opcional por JWT no handshake (necessária para emitir posição)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        // token inválido — liga na mesma, mas sem permissão para emitir
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Entrar na sala de uma encomenda para receber atualizações de posição
    socket.on('join', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });

    // O estafeta envia a sua posição durante a entrega
    socket.on('posicao', async ({ orderId, lat, lng }) => {
      if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') return;

      // Só o estafeta atribuído à encomenda (em entrega) pode emitir
      const order = await Order.findById(orderId)
        .select('estafeta estado')
        .lean()
        .catch(() => null);
      if (!order || order.estado !== 'em_entrega') return;
      if (!socket.user || String(order.estafeta) !== String(socket.user.sub)) return;

      io.to(`order:${orderId}`).emit('posicao', { lat, lng, em: Date.now() });
      await Order.updateOne(
        { _id: orderId },
        { ultimaPosicao: { lat, lng, em: new Date() } }
      ).catch(() => {});
    });
  });

  logger.info('Socket.IO inicializado (rastreio em tempo real).');
  return io;
}
