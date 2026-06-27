import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';
import { sendMail } from './mailer.js';
import { emitToUser } from '../socket.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const ESTADO_TEXTO = {
  pendente: 'foi recebida e está pendente',
  confirmada: 'foi confirmada',
  em_preparacao: 'está em preparação',
  em_entrega: 'está a caminho',
  entregue: 'foi entregue',
  cancelada: 'foi cancelada',
};

/** Cria uma notificação in-app (best-effort, nunca lança) e empurra-a por socket. */
export async function notify(
  userId,
  { tipo = 'info', titulo, mensagem = '', link = '' }
) {
  try {
    const doc = await Notification.create({ user: userId, tipo, titulo, mensagem, link });
    // Push em tempo real para a sala pessoal do utilizador (no-op se offline)
    emitToUser(userId, 'notificacao', {
      _id: String(doc._id),
      tipo: doc.tipo,
      titulo: doc.titulo,
      mensagem: doc.mensagem,
      link: doc.link,
      lida: doc.lida,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    logger.warn(`Notificação in-app falhou: ${err.message}`);
  }
}

/**
 * Notifica o cliente da mudança de estado da sua encomenda:
 * notificação in-app (sempre) + email (best-effort, saltado em testes).
 * Fire-and-forget — nunca lança nem bloqueia o pedido.
 */
export async function notifyOrderStatus(order) {
  try {
    const user = await User.findById(order.cliente);
    if (!user) return;

    const ref = String(order._id).slice(-6).toUpperCase();
    const estado = ESTADO_TEXTO[order.estado] ?? order.estado;
    const link = `/encomendas/${order._id}`;

    await notify(user._id, {
      tipo: 'encomenda',
      titulo: `Encomenda #${ref}`,
      mensagem: `A tua encomenda ${estado}.`,
      link,
    });

    if (env.nodeEnv !== 'test' && user.email) {
      await sendMail({
        to: user.email,
        subject: `Encomenda #${ref} — ${order.estado}`,
        html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px">
          <h2 style="color:#2563eb">ElSircários Tech Store</h2>
          <p>Olá <strong>${user.nome}</strong>,</p>
          <p>A tua encomenda <strong>#${ref}</strong> ${estado}.</p>
          <p>Total: <strong>${order.total.toFixed(2)} €</strong></p>
          <p><a href="${env.clientUrl}${link}" style="background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Ver encomenda</a></p>
          <hr><p style="color:#888;font-size:12px">Este é um email automático.</p>
        </div>`,
      });
    }
  } catch (err) {
    logger.warn(`Notificação de encomenda falhou: ${err.message}`);
  }
}

/** Notifica todas as contas de loja (best-effort). */
async function notifyLojas({ titulo, mensagem, link = '/loja/encomendas' }) {
  const lojas = await User.find({ role: 'loja' }).select('_id');
  await Promise.all(
    lojas.map((l) => notify(l._id, { tipo: 'encomenda', titulo, mensagem, link }))
  );
}

const ref6 = (order) => String(order._id).slice(-6).toUpperCase();

/** Notifica a loja de uma nova encomenda recebida. */
export async function notifyNewOrder(order) {
  try {
    await notifyLojas({
      titulo: `Nova encomenda #${ref6(order)}`,
      mensagem: `Recebeste uma nova encomenda de ${order.total.toFixed(2)} €.`,
    });
  } catch (err) {
    logger.warn(`Notificação de nova encomenda falhou: ${err.message}`);
  }
}

/** Notifica a loja (e o estafeta atribuído, se houver) do cancelamento. */
export async function notifyOrderCancelled(order) {
  try {
    const ref = ref6(order);
    await notifyLojas({
      titulo: `Encomenda #${ref} cancelada`,
      mensagem: `O cliente cancelou a encomenda de ${order.total.toFixed(2)} €.`,
    });
    if (order.estafeta) {
      await notify(order.estafeta, {
        tipo: 'encomenda',
        titulo: `Entrega #${ref} cancelada`,
        mensagem: 'A entrega que tinhas foi cancelada pelo cliente.',
        link: '/estafeta/entregas',
      });
    }
  } catch (err) {
    logger.warn(`Notificação de cancelamento falhou: ${err.message}`);
  }
}

/** Notifica a loja (e o estafeta) de que o cliente confirmou a receção. */
export async function notifyEntregaConfirmada(order) {
  try {
    const ref = ref6(order);
    await notifyLojas({
      titulo: `Entrega #${ref} confirmada`,
      mensagem: 'O cliente confirmou a receção da encomenda.',
    });
    if (order.estafeta) {
      await notify(order.estafeta, {
        tipo: 'encomenda',
        titulo: `Entrega #${ref} confirmada`,
        mensagem: 'O cliente confirmou a receção da tua entrega.',
        link: '/estafeta/entregas',
      });
    }
  } catch (err) {
    logger.warn(`Notificação de confirmação de entrega falhou: ${err.message}`);
  }
}

/** Notifica a loja de que um estafeta recusou a entrega (para reatribuir). */
export async function notifyEntregaRecusada(order, estafetaNome, motivo) {
  try {
    await notifyLojas({
      titulo: `Entrega #${ref6(order)} recusada`,
      mensagem: `${estafetaNome} recusou a entrega${motivo ? `: ${motivo}` : ''}. Escolhe outro estafeta.`,
    });
  } catch (err) {
    logger.warn(`Notificação de recusa falhou: ${err.message}`);
  }
}

/** Notifica o estafeta de que lhe foi atribuída uma entrega. */
export async function notifyEstafetaAtribuido(order) {
  try {
    if (!order.estafeta) return;
    await notify(order.estafeta, {
      tipo: 'encomenda',
      titulo: `Nova entrega #${ref6(order)}`,
      mensagem: `Foi-te atribuída uma entrega para ${order.morada}.`,
      link: '/estafeta/entregas',
    });
  } catch (err) {
    logger.warn(`Notificação de atribuição falhou: ${err.message}`);
  }
}
