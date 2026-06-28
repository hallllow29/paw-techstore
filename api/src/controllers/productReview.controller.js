import mongoose from 'mongoose';
import { ProductReview } from '../models/productReview.model.js';
import { Product } from '../models/product.model.js';
import { Order } from '../models/order.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Resolve o produto a partir de :idOrSlug (ou lança 404). */
async function loadProduct(idOrSlug, res) {
  const query = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  const product = await Product.findOne(query);
  if (!product) {
    res.status(404);
    throw new Error('Produto não encontrado');
  }
  return product;
}

/** O cliente comprou este produto e já o recebeu? */
function comprou(clienteId, produtoId) {
  return Order.exists({
    cliente: clienteId,
    estado: 'entregue',
    'itens.produto': produtoId,
  });
}

/** GET /api/products/:idOrSlug/reviews - lista avaliações + resumo (público). */
export const listProductReviews = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.idOrSlug, res);
  const reviews = await ProductReview.find({ produto: product._id }).sort({
    createdAt: -1,
  });
  res.json({
    success: true,
    count: reviews.length,
    media: product.ratingMedia,
    total: product.numAvaliacoes,
    reviews,
  });
});

/** GET /api/products/:idOrSlug/reviews/me - estado de avaliação do cliente atual. */
export const myReviewStatus = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.idOrSlug, res);
  const review = await ProductReview.findOne({
    produto: product._id,
    cliente: req.user._id,
  });
  const elegivel = review ? false : Boolean(await comprou(req.user._id, product._id));
  res.json({ success: true, jaAvaliou: Boolean(review), podeAvaliar: elegivel, review });
});

/** POST /api/products/:idOrSlug/reviews - cria avaliação (cliente que comprou). */
export const createProductReview = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.idOrSlug, res);
  const { rating, comentario } = req.body;

  if (!(await comprou(req.user._id, product._id))) {
    res.status(403);
    throw new Error('Só podes avaliar produtos que compraste e já recebeste');
  }
  if (await ProductReview.exists({ produto: product._id, cliente: req.user._id })) {
    res.status(409);
    throw new Error('Já avaliaste este produto');
  }

  let review;
  try {
    review = await ProductReview.create({
      produto: product._id,
      cliente: req.user._id,
      nome: req.user.nome,
      rating,
      comentario,
    });
  } catch (err) {
    // Corrida: índice único (produto, cliente) → 409 em vez de 500.
    if (err.code === 11000) {
      res.status(409);
      throw new Error('Já avaliaste este produto');
    }
    throw err;
  }
  const resumo = await ProductReview.recalcular(product._id);

  res.status(201).json({ success: true, review, ...resumo });
});
