import mongoose from 'mongoose';

/**
 * Registo de auditoria de ações sensíveis (accountability/segurança).
 * Guarda quem fez o quê, sobre quem, quando e de que IP.
 */
const auditLogSchema = new mongoose.Schema(
  {
    ator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    atorNome: { type: String, default: '' }, // snapshot (sobrevive a remoções)
    acao: { type: String, required: true }, // ex.: 'estafeta.aprovar'
    alvo: { type: String, default: '' }, // ex.: e-mail do alvo
    detalhe: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
