import mongoose from 'mongoose';

/**
 * @openapi
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         order: { type: string }
 *         ratingEncomenda: { type: integer, minimum: 1, maximum: 5 }
 *         ratingEstafeta: { type: integer, nullable: true }
 *         comentario: { type: string }
 */
const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // uma avaliação por encomenda
      index: true,
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estafeta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    ratingEncomenda: { type: Number, required: true, min: 1, max: 5 },
    ratingEstafeta: { type: Number, min: 1, max: 5, default: null },
    comentario: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

/** Média de avaliação de um estafeta. */
reviewSchema.statics.mediaEstafeta = async function mediaEstafeta(estafetaId) {
  const [r] = await this.aggregate([
    {
      $match: {
        estafeta: new mongoose.Types.ObjectId(estafetaId),
        ratingEstafeta: { $ne: null },
      },
    },
    { $group: { _id: null, media: { $avg: '$ratingEstafeta' }, total: { $sum: 1 } } },
  ]);
  return { media: r ? Math.round(r.media * 10) / 10 : null, total: r?.total ?? 0 };
};

export const Review = mongoose.model('Review', reviewSchema);
