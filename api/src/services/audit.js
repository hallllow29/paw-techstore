import { AuditLog } from '../models/auditLog.model.js';
import { logger } from '../utils/logger.js';

/**
 * Regista uma ação sensível no log de auditoria.
 * Best-effort: nunca lança nem bloqueia o pedido em curso.
 *
 * @param {import('express').Request} req  pedido (para ator e IP)
 * @param {string} acao                    identificador da ação (ex.: 'utilizador.banir')
 * @param {{alvo?: string, detalhe?: string}} [extra]
 */
export async function audit(req, acao, { alvo = '', detalhe = '' } = {}) {
  try {
    await AuditLog.create({
      ator: req.user?._id ?? null,
      atorNome: req.user?.nome ?? '',
      acao,
      alvo,
      detalhe,
      ip: req.ip ?? '',
    });
  } catch (err) {
    logger.warn(`Audit log falhou: ${err.message}`);
  }
}
