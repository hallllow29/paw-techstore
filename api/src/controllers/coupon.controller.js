import { Coupon } from '../models/coupon.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** POST /api/coupons/validate — valida um código para um subtotal (cliente). */
export const validateCoupon = asyncHandler(async (req, res) => {
  const { codigo, subtotal } = req.body;
  const coupon = await Coupon.findOne({
    codigo: String(codigo ?? '')
      .toUpperCase()
      .trim(),
  });
  if (!coupon) {
    res.status(404);
    throw new Error('Cupão inexistente');
  }
  const motivo = coupon.motivoInvalido(Number(subtotal) || 0);
  if (motivo) {
    res.status(422);
    throw new Error(motivo);
  }
  res.json({
    success: true,
    codigo: coupon.codigo,
    desconto: coupon.desconto(Number(subtotal) || 0),
  });
});

/** GET /api/coupons — lista cupões (loja). */
export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, count: coupons.length, coupons });
});

/** POST /api/coupons — cria cupão (loja). */
export const createCoupon = asyncHandler(async (req, res) => {
  const { codigo, tipo, valor, minSubtotal, validoAte, usosMax } = req.body;
  if (await Coupon.exists({ codigo: String(codigo).toUpperCase().trim() })) {
    res.status(409);
    throw new Error('Já existe um cupão com este código');
  }
  const coupon = await Coupon.create({
    codigo,
    tipo,
    valor,
    minSubtotal: minSubtotal || 0,
    validoAte: validoAte || null,
    usosMax: usosMax || null,
  });
  res.status(201).json({ success: true, coupon });
});

/** PUT /api/coupons/:id — atualiza cupão (loja). */
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Cupão não encontrado');
  }
  const campos = ['tipo', 'valor', 'minSubtotal', 'validoAte', 'usosMax', 'ativo'];
  for (const c of campos) {
    // eslint-disable-next-line security/detect-object-injection -- `c` vem de allowlist literal
    if (req.body[c] !== undefined) coupon[c] = req.body[c];
  }
  await coupon.save();
  res.json({ success: true, coupon });
});

/** DELETE /api/coupons/:id — remove cupão (loja). */
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Cupão não encontrado');
  }
  res.json({ success: true, message: 'Cupão removido' });
});
