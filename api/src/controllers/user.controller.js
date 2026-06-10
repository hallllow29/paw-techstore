import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/users — lista utilizadores (admin). Filtros: ?role= &status= */
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

/** GET /api/users/estafetas/pendentes — estafetas a aguardar aprovação (admin). */
export const listPendingEstafetas = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: 'estafeta', status: 'pendente' }).sort({
    createdAt: -1,
  });
  res.json({ success: true, count: users.length, users });
});

/** PATCH /api/users/:id/aprovar — aprova um estafeta (admin). */
export const aprovarEstafeta = asyncHandler(async (req, res) => {
  const user = await setEstafetaStatus(req.params.id, 'ativo', res);
  res.json({ success: true, message: 'Estafeta aprovado', user });
});

/** PATCH /api/users/:id/rejeitar — rejeita um estafeta (admin). */
export const rejeitarEstafeta = asyncHandler(async (req, res) => {
  const user = await setEstafetaStatus(req.params.id, 'rejeitado', res);
  res.json({ success: true, message: 'Estafeta rejeitado', user });
});

async function setEstafetaStatus(id, status, res) {
  const user = await User.findById(id);
  if (!user || user.role !== 'estafeta') {
    res.status(404);
    throw new Error('Estafeta não encontrado');
  }
  user.status = status;
  await user.save();
  return user;
}
