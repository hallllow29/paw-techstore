import { Order } from '../models/order.model.js';
import { User } from '../models/user.model.js';
import { Product } from '../models/product.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DIAS_TENDENCIA = 14; // janela das séries temporais
const STOCK_BAIXO = 5; // limiar de alerta de stock

const naoCancelada = { estado: { $ne: 'cancelada' } };

/** Início do dia (00:00) há `n` dias, incluindo hoje. */
function inicioHaDias(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

/** Soma da receita (encomendas não canceladas), com filtro opcional. */
async function somaReceita(match = {}) {
  const r = await Order.aggregate([
    { $match: { ...naoCancelada, ...match } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return r[0]?.total ?? 0;
}

/** Top produtos por quantidade vendida. */
const topProdutos = (limit = 5) =>
  Order.aggregate([
    { $match: naoCancelada },
    { $unwind: '$itens' },
    { $group: { _id: '$itens.nome', quantidade: { $sum: '$itens.quantidade' } } },
    { $sort: { quantidade: -1 } },
    { $limit: limit },
  ]);

/** Contagem de encomendas agrupadas por estado. */
const encomendasPorEstado = () =>
  Order.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]);

/** Série diária (contagem) de documentos por data de criação. */
const porDia = (Model, match, somar) =>
  Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: somar ? { $sum: somar } : { $sum: 1 },
        contagem: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

/** GET /api/analytics/admin - observabilidade global da plataforma (admin). */
export const adminStats = asyncHandler(async (_req, res) => {
  const desde = inicioHaDias(DIAS_TENDENCIA);
  const [
    totalUtilizadores,
    totalEncomendas,
    totalProdutos,
    porRole,
    porStatus,
    porEstado,
    receita,
    receita30,
    tendencia,
    novosUtilizadores,
    produtos,
    ultimasEncomendas,
    ultimosUtilizadores,
  ] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', total: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$status', total: { $sum: 1 } } }]),
    encomendasPorEstado(),
    somaReceita(),
    somaReceita({ createdAt: { $gte: inicioHaDias(30) } }),
    porDia(Order, { ...naoCancelada, createdAt: { $gte: desde } }, '$total'),
    porDia(User, { createdAt: { $gte: desde } }),
    topProdutos(6),
    Order.find()
      .populate('cliente', 'nome')
      .sort({ createdAt: -1 })
      .limit(6)
      .select('total estado createdAt cliente'),
    User.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('nome email role status createdAt avatar'),
  ]);

  res.json({
    success: true,
    kpis: { totalUtilizadores, totalEncomendas, totalProdutos, receita, receita30 },
    porRole,
    porStatus,
    porEstado,
    tendencia,
    novosUtilizadores,
    topProdutos: produtos,
    ultimasEncomendas,
    ultimosUtilizadores,
  });
});

/** GET /api/analytics/loja - observabilidade da loja (loja/admin). */
export const lojaAnalytics = asyncHandler(async (_req, res) => {
  const desde = inicioHaDias(DIAS_TENDENCIA);
  const [
    totalEncomendas,
    totalProdutos,
    totalClientes,
    porEstado,
    receita,
    receita30,
    ticket,
    tendencia,
    produtos,
    stockBaixoLista,
    stockBaixoCount,
    porPagamento,
  ] = await Promise.all([
    Order.countDocuments(),
    Product.countDocuments(),
    User.countDocuments({ role: 'cliente' }),
    encomendasPorEstado(),
    somaReceita(),
    somaReceita({ createdAt: { $gte: inicioHaDias(30) } }),
    Order.aggregate([
      { $match: naoCancelada },
      { $group: { _id: null, media: { $avg: '$total' } } },
    ]),
    porDia(Order, { ...naoCancelada, createdAt: { $gte: desde } }, '$total'),
    topProdutos(8),
    Product.find({ stock: { $lte: STOCK_BAIXO } })
      .sort({ stock: 1 })
      .limit(10)
      .select('nome stock slug preco imagemDestaque'),
    Product.countDocuments({ stock: { $lte: STOCK_BAIXO } }),
    Order.aggregate([
      { $match: naoCancelada },
      { $group: { _id: '$metodoPagamento', total: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    kpis: {
      totalEncomendas,
      totalProdutos,
      totalClientes,
      receita,
      receita30,
      ticketMedio: ticket[0]?.media ?? 0,
      stockBaixo: stockBaixoCount,
    },
    porEstado,
    tendencia,
    topProdutos: produtos,
    stockBaixoLista,
    porPagamento,
  });
});
