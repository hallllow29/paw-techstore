import mongoose from 'mongoose';
import { DELIVERY_METHODS } from '../utils/constants.js';

/**
 * Configuração da loja (documento único — só há 1 loja/marca).
 *
 * @openapi
 * components:
 *   schemas:
 *     StoreSettings:
 *       type: object
 *       properties:
 *         nome: { type: string }
 *         logotipo: { type: string }
 *         horario: { type: string }
 *         metodosEntrega:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               metodo: { type: string, enum: [levantamento_loja, estafeta, transportadora] }
 *               ativo: { type: boolean }
 *               custo: { type: number }
 */
const deliveryMethodSchema = new mongoose.Schema(
  {
    metodo: { type: String, enum: DELIVERY_METHODS, required: true },
    ativo: { type: Boolean, default: true },
    custo: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    nome: { type: String, default: 'paw-techstore', trim: true },
    logotipo: { type: String, default: '' },
    horario: { type: String, default: 'Seg-Sex 9h-18h' },
    metodosEntrega: {
      type: [deliveryMethodSchema],
      default: [
        { metodo: 'levantamento_loja', ativo: true, custo: 0 },
        { metodo: 'estafeta', ativo: true, custo: 4.99 },
        { metodo: 'transportadora', ativo: true, custo: 6.99 },
      ],
    },
  },
  { timestamps: true }
);

/** Devolve a configuração (cria com defaults se ainda não existir). */
storeSettingsSchema.statics.getSettings = async function getSettings() {
  return (await this.findOne()) ?? this.create({});
};

export const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);
