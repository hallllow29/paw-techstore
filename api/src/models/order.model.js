import mongoose from 'mongoose';
import { DELIVERY_METHODS, ORDER_STATES, PAYMENT_METHODS } from '../utils/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nome: { type: String, required: true }, // snapshot
    preco: { type: Number, required: true }, // snapshot do preço unitário
    quantidade: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const historicoSchema = new mongoose.Schema(
  {
    estado: { type: String, enum: ORDER_STATES, required: true },
    em: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         cliente: { type: string }
 *         itens: { type: array, items: { type: object } }
 *         subtotal: { type: number }
 *         custoEntrega: { type: number }
 *         total: { type: number }
 *         metodoEntrega: { type: string }
 *         estado: { type: string, enum: [pendente, confirmada, em_preparacao, em_entrega, entregue, cancelada] }
 *         estafeta: { type: string, nullable: true }
 */
const orderSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itens: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    cupao: { type: String, default: '' }, // código do cupão aplicado
    desconto: { type: Number, default: 0, min: 0 },
    custoEntrega: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    metodoEntrega: { type: String, enum: DELIVERY_METHODS, required: true },
    morada: { type: String, default: '' }, // snapshot da morada de entrega
    estado: { type: String, enum: ORDER_STATES, default: 'pendente', index: true },
    estafeta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    confirmadaEm: { type: Date, default: null }, // marca o início da janela de cancelamento
    metodoPagamento: { type: String, enum: PAYMENT_METHODS, default: 'entrega' },
    pago: { type: Boolean, default: false },
    stripeSessionId: { type: String, default: '' },
    // Referência Multibanco (gerada quando o método é multibanco)
    multibanco: {
      entidade: { type: String, default: '' },
      referencia: { type: String, default: '' },
    },
    // Última posição do estafeta (rastreio em tempo real durante a entrega)
    ultimaPosicao: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      em: { type: Date, default: null },
    },
    historico: { type: [historicoSchema], default: () => [{ estado: 'pendente' }] },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
