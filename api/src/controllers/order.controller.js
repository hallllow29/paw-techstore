import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { StoreSettings } from '../models/storeSettings.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CANCEL_WINDOW_MIN } from '../utils/constants.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Atualiza o estado e regista no histórico. */
function setEstado(order, estado) {
  order.estado = estado;
  if (estado === 'confirmada' && !order.confirmadaEm) order.confirmadaEm = new Date();
  order.historico.push({ estado });
}

// ─────────────────────────── CLIENTE ───────────────────────────

/** POST /api/orders — cria encomenda a partir do carrinho (cliente). */
export const createOrder = asyncHandler(async (req, res) => {
  const { itens, metodoEntrega } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    res.status(400);
    throw new Error('O carrinho está vazio');
  }

  const settings = await StoreSettings.getSettings();
  const metodo = settings.metodosEntrega.find(
    (m) => m.metodo === metodoEntrega && m.ativo
  );
  if (!metodo) {
    res.status(400);
    throw new Error('Método de entrega indisponível');
  }

  // Validar stock e construir os itens (com snapshot de nome/preço)
  let subtotal = 0;
  const orderItens = [];
  for (const item of itens) {
    const product = await Product.findById(item.produto);
    const qtd = Number(item.quantidade);
    if (!product || !product.ativo) {
      res.status(404);
      throw new Error('Produto inexistente');
    }
    if (!Number.isInteger(qtd) || qtd < 1) {
      res.status(400);
      throw new Error('Quantidade inválida');
    }
    if (product.stock < qtd) {
      res.status(409);
      throw new Error(`Sem stock suficiente para "${product.nome}"`);
    }
    subtotal += product.preco * qtd;
    orderItens.push({
      produto: product._id,
      nome: product.nome,
      preco: product.preco,
      quantidade: qtd,
    });
  }

  // Descontar o stock
  for (const item of orderItens) {
    await Product.updateOne({ _id: item.produto }, { $inc: { stock: -item.quantidade } });
  }

  const custoEntrega = metodo.custo;
  const order = await Order.create({
    cliente: req.user._id,
    itens: orderItens,
    subtotal: round2(subtotal),
    custoEntrega,
    total: round2(subtotal + custoEntrega),
    metodoEntrega,
    morada: req.user.morada,
  });

  res.status(201).json({ success: true, order });
});

/** GET /api/orders/me — histórico de encomendas do cliente. */
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ cliente: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

/** PATCH /api/orders/:id/cancelar — cancela (regra dos 10 min). */
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (String(order.cliente) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Não é a tua encomenda');
  }

  const dentroDaJanela =
    order.estado === 'confirmada' &&
    order.confirmadaEm &&
    Date.now() - order.confirmadaEm.getTime() <= CANCEL_WINDOW_MIN * 60 * 1000;

  if (order.estado !== 'pendente' && !dentroDaJanela) {
    res.status(403);
    throw new Error('Já não é possível cancelar esta encomenda');
  }

  // Repor o stock
  for (const item of order.itens) {
    await Product.updateOne({ _id: item.produto }, { $inc: { stock: item.quantidade } });
  }
  setEstado(order, 'cancelada');
  await order.save();
  res.json({ success: true, order });
});

// ──────────────────────────── LOJA ─────────────────────────────

/** GET /api/orders — todas as encomendas (loja). */
export const listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.estado) filter.estado = req.query.estado;
  const orders = await Order.find(filter)
    .populate('cliente', 'nome email')
    .populate('estafeta', 'nome')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

/** PATCH /api/orders/:id/estado — a loja avança o estado. */
export const updateStatus = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  const permitidos = ['confirmada', 'em_preparacao', 'em_entrega', 'entregue'];
  if (!permitidos.includes(estado)) {
    res.status(400);
    throw new Error('Transição de estado inválida');
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (order.estado === 'cancelada' || order.estado === 'entregue') {
    res.status(409);
    throw new Error('A encomenda já está fechada');
  }
  setEstado(order, estado);
  await order.save();
  res.json({ success: true, order });
});

// ─────────────────────────── ESTAFETA ──────────────────────────

/** GET /api/orders/entregas/disponiveis — entregas por estafeta prontas (estafeta). */
export const availableDeliveries = asyncHandler(async (_req, res) => {
  const orders = await Order.find({
    metodoEntrega: 'estafeta',
    estado: 'em_preparacao',
    estafeta: null,
  })
    .populate('cliente', 'nome morada')
    .sort({ createdAt: 1 });
  res.json({ success: true, count: orders.length, orders });
});

/** PATCH /api/orders/:id/aceitar — estafeta aceita uma entrega (1 de cada vez). */
export const acceptDelivery = asyncHandler(async (req, res) => {
  // Regra: um estafeta só pode ter uma entrega em curso
  const ativa = await Order.exists({ estafeta: req.user._id, estado: 'em_entrega' });
  if (ativa) {
    res.status(409);
    throw new Error('Já tens uma entrega em curso. Conclui-a primeiro.');
  }

  const order = await Order.findById(req.params.id);
  if (
    !order ||
    order.metodoEntrega !== 'estafeta' ||
    order.estado !== 'em_preparacao' ||
    order.estafeta
  ) {
    res.status(409);
    throw new Error('Entrega indisponível');
  }

  order.estafeta = req.user._id;
  setEstado(order, 'em_entrega');
  await order.save();
  res.json({ success: true, order });
});

/** PATCH /api/orders/:id/entregue — estafeta marca como entregue. */
export const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (
    !order ||
    String(order.estafeta) !== String(req.user._id) ||
    order.estado !== 'em_entrega'
  ) {
    res.status(409);
    throw new Error('Não tens esta entrega em curso');
  }
  setEstado(order, 'entregue');
  await order.save();
  res.json({ success: true, order });
});

/** GET /api/orders/entregas/minhas — histórico de entregas do estafeta. */
export const myDeliveries = asyncHandler(async (req, res) => {
  const orders = await Order.find({ estafeta: req.user._id })
    .populate('cliente', 'nome morada')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

// ──────────────────────── PARTILHADO ───────────────────────────

/** GET /api/orders/:id — detalhe (dono, loja/admin ou estafeta atribuído). */
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('cliente', 'nome email morada')
    .populate('estafeta', 'nome');
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }

  const u = req.user;
  const dono = String(order.cliente._id ?? order.cliente) === String(u._id);
  const estafetaAtribuido =
    order.estafeta && String(order.estafeta._id ?? order.estafeta) === String(u._id);
  if (!dono && !estafetaAtribuido && u.role !== 'loja' && u.role !== 'admin') {
    res.status(403);
    throw new Error('Sem permissão para ver esta encomenda');
  }

  res.json({ success: true, order });
});
