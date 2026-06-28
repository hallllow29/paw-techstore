import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../services/audit.js';

/** GET /api/users - lista utilizadores (admin). Filtros: ?role= &status= */
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

/** GET /api/users/estafetas/pendentes - estafetas a aguardar aprovação (admin). */
export const listPendingEstafetas = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: 'estafeta', status: 'pendente' }).sort({
    createdAt: -1,
  });
  res.json({ success: true, count: users.length, users });
});

/** PATCH /api/users/:id/aprovar - aprova um estafeta (admin). */
export const aprovarEstafeta = asyncHandler(async (req, res) => {
  const user = await setEstafetaStatus(req.params.id, 'ativo', res);
  await audit(req, 'estafeta.aprovar', { alvo: user.email });
  res.json({ success: true, message: 'Estafeta aprovado', user });
});

/** PATCH /api/users/:id/rejeitar - rejeita um estafeta (admin). */
export const rejeitarEstafeta = asyncHandler(async (req, res) => {
  const user = await setEstafetaStatus(req.params.id, 'rejeitado', res);
  await audit(req, 'estafeta.rejeitar', { alvo: user.email });
  res.json({ success: true, message: 'Estafeta rejeitado', user });
});

async function setEstafetaStatus(id, status, res) {
  const user = await User.findById(id);
  if (user?.role !== 'estafeta') {
    res.status(404);
    throw new Error('Estafeta não encontrado');
  }
  user.status = status;
  await user.save();
  return user;
}

/** PATCH /api/users/:id/banir - suspende uma conta (admin). */
export const banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Não é possível suspender um administrador');
  }
  if (String(user._id) === String(req.user._id)) {
    res.status(400);
    throw new Error('Não te podes suspender a ti próprio');
  }
  user.status = 'banido';
  await user.save();
  await audit(req, 'utilizador.banir', {
    alvo: user.email,
    detalhe: req.body?.motivo ?? '',
  });
  res.json({ success: true, message: 'Conta suspensa', user });
});

/** PATCH /api/users/:id/desbanir - reativa uma conta suspensa (admin). */
export const unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  user.status = 'ativo';
  await user.save();
  await audit(req, 'utilizador.reativar', { alvo: user.email });
  res.json({ success: true, message: 'Conta reativada', user });
});

/** GET /api/users/audit - registo de auditoria de ações sensíveis (admin). */
export const listAudit = asyncHandler(async (_req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, count: logs.length, logs });
});
