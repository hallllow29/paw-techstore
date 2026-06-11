import { StoreSettings } from '../models/storeSettings.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicPath } from '../middleware/upload.js';

/** GET /api/store — configuração da loja (público; o frontend usa o nome/logo). */
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await StoreSettings.getSettings();
  res.json({ success: true, settings });
});

/** PUT /api/store — atualiza a configuração (loja). */
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
