import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.js';
import { Order } from './models/order.model.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// Referência ao servidor Socket.IO, partilhada com os serviços que precisam
// de empurrar eventos em tempo real (ex.: notificações). Fica null em testes,
// onde o socket não arranca - e emitToUser passa a no-op.
let ioRef = null;

/** Empurra um evento para a sala pessoal de um utilizador (`user:<id>`). */
export function emitToUser(userId, event, payload) {
  if (!ioRef || !userId) return;
  ioRef.to(`user:${String(userId)}`).emit(event, payload);
}

/**
 * Notifica em tempo real as partes interessadas numa encomenda (o cliente, todas
 * as lojas e os estafetas) de que esta mudou, para as vistas se atualizarem sem
 * refresh. Envia só um sinal leve (id + estado); o cliente recarrega.
 */
export function emitOrderUpdate(order) {
  if (!ioRef || !order) return;
  const payload = { id: String(order._id), estado: order.estado };
  ioRef.to('lojas').emit('order:update', payload);
  ioRef.to('estafetas').emit('order:update', payload);
  if (order.cliente)
    ioRef.to(`user:${String(order.cliente)}`).emit('order:update', payload);
  if (order.estafeta)
    ioRef.to(`user:${String(order.estafeta)}`).emit('order:update', payload);
}

/**
 * Inicializa o Socket.IO para rastreio em tempo real do estafeta.
 * - Cada encomenda tem uma sala `order:<id>`.
 * - Cada utilizador autenticado entra na sua sala pessoal `user:<id>` para
 *   receber notificações em tempo real.
 * - O estafeta atribuído emite a sua posição; o servidor retransmite para a
 *   sala (cliente/loja) e persiste a última posição na encomenda.
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });
  ioRef = io;

  // Autenticação opcional por JWT no handshake (necessária para emitir posição)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        // token inválido - liga na mesma, mas sem permissão para emitir
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Sala pessoal: recebe notificações em tempo real (encomendas, estado, …)
    if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);
    // Salas por perfil: atualizações de encomendas em tempo real
    if (socket.user?.role === 'loja') socket.join('lojas');
    if (socket.user?.role === 'estafeta') socket.join('estafetas');

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
      if (String(order.estafeta) !== String(socket.user?.sub)) return;

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
