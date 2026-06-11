import mongoose from 'mongoose';

export const COUPON_TYPES = ['percentagem', 'valor'];

/**
 * @openapi
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       properties:
 *         codigo: { type: string }
 *         tipo: { type: string, enum: [percentagem, valor] }
 *         valor: { type: number }
 *         minSubtotal: { type: number }
 *         validoAte: { type: string, format: date-time, nullable: true }
 *         usosMax: { type: integer, nullable: true }
 *         usos: { type: integer }
 *         ativo: { type: boolean }
 */
const couponSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'O código é obrigatório'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    tipo: { type: String, enum: COUPON_TYPES, required: true },
    valor: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    validoAte: { type: Date, default: null },
    usosMax: { type: Number, default: null, min: 1 }, // null = ilimitado
    usos: { type: Number, default: 0, min: 0 },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Verifica se o cupão é aplicável a um dado subtotal. Devolve null se OK. */
couponSchema.methods.motivoInvalido = function motivoInvalido(subtotal) {
  if (!this.ativo) return 'Cupão inativo';
  if (this.validoAte && this.validoAte.getTime() < Date.now()) return 'Cupão expirado';
  if (this.usosMax !== null && this.usos >= this.usosMax) return 'Cupão esgotado';
  if (subtotal < this.minSubtotal) {
    return `Subtotal mínimo de ${this.minSubtotal.toFixed(2)} € não atingido`;
  }
  return null;
};

/** Calcula o desconto (limitado ao subtotal). */
couponSchema.methods.desconto = function desconto(subtotal) {
  const bruto = this.tipo === 'percentagem' ? (subtotal * this.valor) / 100 : this.valor;
  return Math.min(Math.round(bruto * 100) / 100, subtotal);
};

export const Coupon = mongoose.model('Coupon', couponSchema);
