import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { Review } from '../models/review.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const topItens = (match, limit = 5) =>
  Order.aggregate([
    { $match: { estado: { $ne: 'cancelada' }, ...match } },
    { $unwind: '$itens' },
    {
      $group: {
        _id: '$itens.nome',
        quantidade: { $sum: '$itens.quantidade' },
      },
    },
    { $sort: { quantidade: -1 } },
    { $limit: limit },
  ]);

/** GET /api/dashboard - estatísticas conforme o perfil do utilizador. */
export const getDashboard = asyncHandler(async (req, res) => {
  const u = req.user;
  const data = {};

  if (u.role === 'cliente') {
    const clienteId = new mongoose.Types.ObjectId(u._id);
    data.numEncomendas = await Order.countDocuments({ cliente: u._id });
    data.totalGasto =
      (
        await Order.aggregate([
          { $match: { cliente: clienteId, estado: { $ne: 'cancelada' } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ])
      )[0]?.total ?? 0;
    data.produtosMaisComprados = await topItens({ cliente: clienteId });
  } else if (u.role === 'loja') {
    data.numEncomendas = await Order.countDocuments();
    data.receita =
      (
        await Order.aggregate([
          { $match: { estado: { $ne: 'cancelada' } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ])
      )[0]?.total ?? 0;
    data.numProdutos = await Product.countDocuments();
    data.produtosMaisVendidos = await topItens({});
  } else if (u.role === 'estafeta') {
    const estafetaId = new mongoose.Types.ObjectId(u._id);
    data.numEntregas = await Order.countDocuments({
      estafeta: u._id,
      estado: 'entregue',
    });
    data.entregasEmCurso = await Order.countDocuments({
      estafeta: u._id,
      estado: 'em_entrega',
    });
    data.valorAReceber =
      (
        await Order.aggregate([
          { $match: { estafeta: estafetaId, estado: 'entregue' } },
          { $group: { _id: null, total: { $sum: '$custoEntrega' } } },
        ])
      )[0]?.total ?? 0;
    const avaliacao = await Review.mediaEstafeta(u._id);
    data.avaliacaoMedia = avaliacao.media;
    data.numAvaliacoes = avaliacao.total;
  } else if (u.role === 'admin') {
    data.numUtilizadores = await User.countDocuments();
    data.totalEncomendas = await Order.countDocuments();
    data.estafetasPendentes = await User.countDocuments({
      role: 'estafeta',
      status: 'pendente',
    });
    data.utilizadoresPorRole = await User.aggregate([
      { $group: { _id: '$role', total: { $sum: 1 } } },
    ]);
  }

  res.json({ success: true, role: u.role, data });
});
