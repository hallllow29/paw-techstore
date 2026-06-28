import { StoreSettings } from '../models/storeSettings.model.js';
import { User } from '../models/user.model.js';
import { Order } from '../models/order.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.js';

/** GET /api/store/estafetas - disponibilidade de estafetas (para o checkout). */
export const getCouriers = asyncHandler(async (_req, res) => {
  const ativos = await User.find({ role: 'estafeta', status: 'ativo' }, '_id');
  // Estafetas ocupados = com uma entrega em curso (1 de cada vez)
  const ocupados = await Order.distinct('estafeta', {
    estado: 'em_entrega',
    estafeta: { $ne: null },
  });
  const ocupadosSet = new Set(ocupados.map(String));
  const livres = ativos.filter((e) => !ocupadosSet.has(String(e._id))).length;
  res.json({ success: true, total: ativos.length, livres });
});

/** GET /api/store - configuração da loja (público; o frontend usa o nome/logo). */
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await StoreSettings.getSettings();
  res.json({ success: true, settings });
});

/** PUT /api/store - atualiza a configuração (loja). */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await StoreSettings.getSettings();
  const { nome, horario, metodosEntrega } = req.body;

  if (nome !== undefined) settings.nome = nome;
  if (horario !== undefined) settings.horario = horario;
  if (metodosEntrega !== undefined) {
    settings.metodosEntrega =
      typeof metodosEntrega === 'string' ? JSON.parse(metodosEntrega) : metodosEntrega;
  }
  // logótipo enviado como ficheiro (multipart)
  if (req.file) settings.logotipo = toPublicPath(req.file);

  await settings.save();
  res.json({ success: true, settings });
});
