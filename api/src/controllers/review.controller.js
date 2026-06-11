import { Review } from '../models/review.model.js';
import { Order } from '../models/order.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** POST /api/reviews — avalia uma encomenda entregue (cliente). */
export const createReview = asyncHandler(async (req, res) => {
  const { orderId, ratingEncomenda, ratingEstafeta, comentario } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (String(order.cliente) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Não é a tua encomenda');
  }
  if (order.estado !== 'entregue') {
    res.status(409);
    throw new Error('Só podes avaliar encomendas entregues');
  }
  if (await Review.exists({ order: order._id })) {
    res.status(409);
    throw new Error('Esta encomenda já foi avaliada');
  }

  const review = await Review.create({
    order: order._id,
    cliente: req.user._id,
    estafeta: order.estafeta ?? null,
    ratingEncomenda,
    // só guarda avaliação do estafeta se a entrega foi por estafeta
    ratingEstafeta: order.estafeta ? ratingEstafeta : null,
    comentario,
  });

  res.status(201).json({ success: true, review });
});

/** GET /api/reviews/order/:orderId — avaliação de uma encomenda (ou null). */
export const getReviewByOrder = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ order: req.params.orderId });
  res.json({ success: true, review });
});

/** GET /api/reviews — todas as avaliações (loja). */
export const listReviews = asyncHandler(async (_req, res) => {
  const reviews = await Review.find()
    .populate('cliente', 'nome')
    .populate('estafeta', 'nome')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, reviews });
});
