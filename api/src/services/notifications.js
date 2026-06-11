import { User } from '../models/user.model.js';
import { sendMail } from './mailer.js';
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

/**
 * Notifica o cliente por email da mudança de estado da sua encomenda.
 * Best-effort e fire-and-forget — nunca lança nem bloqueia o pedido.
 */
export async function notifyOrderStatus(order) {
  if (env.nodeEnv === 'test') return;
  try {
    const user = await User.findById(order.cliente);
    if (!user?.email) return;

    const ref = String(order._id).slice(-6).toUpperCase();
    const estado = ESTADO_TEXTO[order.estado] ?? order.estado;
    const link = `${env.clientUrl}/encomendas/${order._id}`;

    await sendMail({
      to: user.email,
      subject: `Encomenda #${ref} — ${order.estado}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px">
          <h2 style="color:#c2410c">paw-techstore</h2>
          <p>Olá <strong>${user.nome}</strong>,</p>
          <p>A tua encomenda <strong>#${ref}</strong> ${estado}.</p>
          <p>Total: <strong>${order.total.toFixed(2)} €</strong></p>
          <p><a href="${link}" style="background:#c2410c;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">Ver encomenda</a></p>
          <hr><p style="color:#888;font-size:12px">Este é um email automático.</p>
        </div>`,
    });
  } catch (err) {
    logger.warn(`Notificação de encomenda falhou: ${err.message}`);
  }
}
