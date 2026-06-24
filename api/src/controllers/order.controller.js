import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { StoreSettings } from '../models/storeSettings.model.js';
import { Coupon } from '../models/coupon.model.js';
import { User } from '../models/user.model.js';
import { randomInt } from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CANCEL_WINDOW_MIN, PAYMENT_METHODS } from '../utils/constants.js';
import {
  notifyOrderStatus,
  notifyNewOrder,
  notifyOrderCancelled,
  notifyEstafetaAtribuido,
} from '../services/notifications.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Gera uma referência Multibanco (entidade 5 díg. + referência 9 díg.). */
function gerarReferenciaMb() {
  return {
    entidade: String(randomInt(10000, 100000)),
    referencia: String(randomInt(100000000, 1000000000)),
  };
}

/** Atualiza o estado e regista no histórico. */
function setEstado(order, estado) {
  order.estado = estado;
  if (estado === 'confirmada' && !order.confirmadaEm) order.confirmadaEm = new Date();
  order.historico.push({ estado });
}

// ─────────────────────────── CLIENTE ───────────────────────────

/** POST /api/orders — cria encomenda a partir do carrinho (cliente). */
export const createOrder = asyncHandler(async (req, res) => {
  const {
    itens,
    metodoEntrega,
    cupao: codigoCupao,
    morada: moradaEscolhida,
    metodoPagamento: metodoPag,
    guardarMorada,
  } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) {
    res.status(400);
    throw new Error('O carrinho está vazio');
  }

  const metodoPagamento = PAYMENT_METHODS.includes(metodoPag) ? metodoPag : 'entrega';
  const morada = (moradaEscolhida ?? '').trim() || req.user.morada;

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
    if (!product?.ativo) {
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

  // Cupão de desconto (opcional) — validado antes de mexer no stock.
  // O incremento de usos só acontece depois do stock garantido (ver abaixo).
  let desconto = 0;
  let codigoAplicado = '';
  let couponDoc = null;
  if (codigoCupao) {
    couponDoc = await Coupon.findOne({
      codigo: String(codigoCupao).toUpperCase().trim(),
    });
    if (!couponDoc) {
      res.status(404);
      throw new Error('Cupão inexistente');
    }
    const motivo = couponDoc.motivoInvalido(subtotal);
    if (motivo) {
      res.status(422);
      throw new Error(motivo);
    }
    desconto = couponDoc.desconto(subtotal);
    codigoAplicado = couponDoc.codigo;
  }

  // Descontar o stock de forma ATÓMICA (condição stock >= qtd no próprio update),
  // com rollback se algum item entretanto ficar sem stock — evita overselling.
  const descontados = [];
  for (const item of orderItens) {
    const r = await Product.updateOne(
      { _id: item.produto, stock: { $gte: item.quantidade } },
      { $inc: { stock: -item.quantidade } }
    );
    if (r.modifiedCount === 1) {
      descontados.push(item);
    } else {
      for (const d of descontados) {
        await Product.updateOne({ _id: d.produto }, { $inc: { stock: d.quantidade } });
      }
      res.status(409);
      throw new Error(`Sem stock suficiente para "${item.nome}"`);
    }
  }

  // Stock garantido: agora sim conta o uso do cupão.
  if (couponDoc) {
    couponDoc.usos += 1;
    await couponDoc.save();
  }

  const custoEntrega = metodo.custo;
  const multibanco = metodoPagamento === 'multibanco' ? gerarReferenciaMb() : undefined;
  const order = await Order.create({
    cliente: req.user._id,
    itens: orderItens,
    subtotal: round2(subtotal),
    cupao: codigoAplicado,
    desconto: round2(desconto),
    custoEntrega,
    total: round2(subtotal - desconto + custoEntrega),
    metodoEntrega,
    morada,
    metodoPagamento,
    multibanco,
  });

  // Guardar a nova morada no perfil, se pedido e ainda não existir
  if (guardarMorada && morada !== req.user.morada && !req.user.moradas.includes(morada)) {
    await User.updateOne({ _id: req.user._id }, { $addToSet: { moradas: morada } });
  }

  notifyOrderStatus(order); // notifica o cliente (in-app + email)
  notifyNewOrder(order); // notifica a loja da nova encomenda
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

  // Cancela de forma ATÓMICA: só transita se o estado ainda for o que validámos
  // (evita que dois cancelamentos concorrentes reponham o stock em duplicado).
  const cancelada = await Order.findOneAndUpdate(
    { _id: order._id, estado: order.estado },
    { $set: { estado: 'cancelada' }, $push: { historico: { estado: 'cancelada' } } },
    { new: true }
  );
  if (!cancelada) {
    res.status(409);
    throw new Error('Já não é possível cancelar esta encomenda');
  }

  // Repor o stock e o uso do cupão (apenas uma vez, garantido pelo claim acima)
  for (const item of order.itens) {
    await Product.updateOne({ _id: item.produto }, { $inc: { stock: item.quantidade } });
  }
  if (order.cupao) {
    await Coupon.updateOne(
      { codigo: order.cupao, usos: { $gt: 0 } },
      { $inc: { usos: -1 } }
    );
  }

  notifyOrderStatus(cancelada); // cliente
  notifyOrderCancelled(cancelada); // loja (e estafeta atribuído, se houver)
  res.json({ success: true, order: cancelada });
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

// Transições válidas que a loja pode aplicar (sequenciais — sem saltar nem regredir)
const TRANSICOES_LOJA = new Map([
  ['pendente', ['confirmada']],
  ['confirmada', ['em_preparacao']],
  ['em_preparacao', ['em_entrega']],
  ['em_entrega', ['entregue']],
]);

/** PATCH /api/orders/:id/estado — a loja avança o estado. */
export const updateStatus = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (order.estado === 'cancelada' || order.estado === 'entregue') {
    res.status(409);
    throw new Error('A encomenda já está fechada');
  }
  // Só permite avançar para o estado seguinte na sequência
  if (!(TRANSICOES_LOJA.get(order.estado) ?? []).includes(estado)) {
    res.status(409);
    throw new Error('Transição de estado inválida');
  }
  setEstado(order, estado);
  await order.save();
  notifyOrderStatus(order);
  res.json({ success: true, order });
});

/** Conjunto dos estafetas atualmente com entrega em curso (ocupados). */
async function estafetasOcupados() {
  const ids = await Order.distinct('estafeta', {
    estado: 'em_entrega',
    estafeta: { $ne: null },
  });
  return new Set(ids.map(String));
}

/** GET /api/orders/entregas/estafetas — estafetas e disponibilidade (loja). */
export const listCouriers = asyncHandler(async (_req, res) => {
  const estafetas = await User.find({ role: 'estafeta', status: 'ativo' }).select(
    'nome disponivel'
  );
  const ocupados = await estafetasOcupados();
  const lista = estafetas.map((e) => {
    const ocupado = ocupados.has(String(e._id));
    return {
      _id: e._id,
      nome: e.nome,
      ocupado,
      // Atribuível = marcado disponível e sem entrega em curso
      disponivel: e.disponivel && !ocupado,
    };
  });
  res.json({ success: true, estafetas: lista });
});

/** PATCH /api/orders/:id/atribuir — a loja atribui a entrega a um estafeta. */
export const assignDelivery = asyncHandler(async (req, res) => {
  const { estafetaId } = req.body;
  const estafeta = await User.findOne({
    _id: estafetaId,
    role: 'estafeta',
    status: 'ativo',
  });
  if (!estafeta) {
    res.status(404);
    throw new Error('Estafeta não encontrado');
  }
  if (!estafeta.disponivel) {
    res.status(409);
    throw new Error('Esse estafeta está indisponível');
  }
  if (await Order.exists({ estafeta: estafetaId, estado: 'em_entrega' })) {
    res.status(409);
    throw new Error('Esse estafeta já tem uma entrega em curso');
  }

  // Atribuição ATÓMICA: só se for entrega por estafeta, ainda sem estafeta e
  // num estado válido (confirmada/em_preparacao).
  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      metodoEntrega: 'estafeta',
      estado: { $in: ['confirmada', 'em_preparacao'] },
      estafeta: null,
    },
    {
      $set: { estafeta: estafetaId, estado: 'em_entrega' },
      $push: { historico: { estado: 'em_entrega' } },
    },
    { new: true }
  );
  if (!order) {
    res.status(409);
    throw new Error('Esta encomenda não pode ser atribuída');
  }
  notifyOrderStatus(order); // cliente: vai a caminho
  notifyEstafetaAtribuido(order); // estafeta: tens nova entrega
  res.json({ success: true, order });
});

// ─────────────────────────── ESTAFETA ──────────────────────────

/** PATCH /api/orders/entregas/disponibilidade — estafeta liga/desliga disponibilidade. */
export const setDisponibilidade = asyncHandler(async (req, res) => {
  const disponivel = Boolean(req.body.disponivel);
  await User.updateOne({ _id: req.user._id }, { $set: { disponivel } });
  res.json({ success: true, disponivel });
});

/** GET /api/orders/entregas/disponiveis — entregas por estafeta prontas (estafeta). */
export const availableDeliveries = asyncHandler(async (_req, res) => {
  // Disponível assim que a loja confirma (ou põe em preparação) e ainda sem estafeta
  const orders = await Order.find({
    metodoEntrega: 'estafeta',
    estado: { $in: ['confirmada', 'em_preparacao'] },
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

  // Reivindica a encomenda de forma ATÓMICA: só um estafeta a consegue apanhar
  // (a condição estafeta:null + estado garante que não há dupla atribuição).
  const order = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      metodoEntrega: 'estafeta',
      estado: { $in: ['confirmada', 'em_preparacao'] },
      estafeta: null,
    },
    {
      $set: { estafeta: req.user._id, estado: 'em_entrega' },
      $push: { historico: { estado: 'em_entrega' } },
    },
    { new: true }
  );
  if (!order) {
    res.status(409);
    throw new Error('Entrega indisponível');
  }
  notifyOrderStatus(order);
  res.json({ success: true, order });
});

/** PATCH /api/orders/:id/entregue — estafeta marca como entregue. */
export const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (
    String(order?.estafeta) !== String(req.user._id) ||
    order?.estado !== 'em_entrega'
  ) {
    res.status(409);
    throw new Error('Não tens esta entrega em curso');
  }
  setEstado(order, 'entregue');
  await order.save();
  notifyOrderStatus(order);
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
  const dono =
    order.cliente && String(order.cliente._id ?? order.cliente) === String(u._id);
  const estafetaAtribuido =
    order.estafeta && String(order.estafeta._id ?? order.estafeta) === String(u._id);
  if (!dono && !estafetaAtribuido && u.role !== 'loja' && u.role !== 'admin') {
    res.status(403);
    throw new Error('Sem permissão para ver esta encomenda');
  }

  res.json({ success: true, order });
});
