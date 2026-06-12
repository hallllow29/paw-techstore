import mongoose from 'mongoose';
import { Product } from './product.model.js';

/**
 * Avaliação de um PRODUTO por um cliente que o comprou.
 * (Diferente de Review, que avalia a encomenda/estafeta.)
 */
const productReviewSchema = new mongoose.Schema(
  {
    produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, default: '', trim: true }, // snapshot do nome para mostrar
    rating: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// Um cliente só avalia cada produto uma vez
productReviewSchema.index({ produto: 1, cliente: 1 }, { unique: true });

/** Recalcula e grava a média/contagem no produto. */
productReviewSchema.statics.recalcular = async function recalcular(produtoId) {
  const [r] = await this.aggregate([
    { $match: { produto: new mongoose.Types.ObjectId(produtoId) } },
    { $group: { _id: null, media: { $avg: '$rating' }, total: { $sum: 1 } } },
  ]);
  const ratingMedia = r ? Math.round(r.media * 10) / 10 : 0;
  const numAvaliacoes = r?.total ?? 0;
  await Product.updateOne({ _id: produtoId }, { ratingMedia, numAvaliacoes });
  return { ratingMedia, numAvaliacoes };
};

export const ProductReview = mongoose.model('ProductReview', productReviewSchema);
