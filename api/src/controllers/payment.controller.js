import { getStripe } from '../services/stripe.js';
import {
  paypalAtivo,
  createPaypalOrder,
  capturePaypalOrder,
} from '../services/paypal.js';
import { Order } from '../models/order.model.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/payments/config - indica que pagamentos online estão disponíveis. */
export const paymentConfig = asyncHandler(async (_req, res) => {
  res.json({ success: true, enabled: Boolean(getStripe()), paypal: paypalAtivo() });
});

/** POST /api/payments/checkout/:orderId - cria uma sessão de Checkout Stripe. */
export const createCheckout = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Pagamento online não está configurado');
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (String(order.cliente) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Não é a tua encomenda');
  }
  if (order.pago) {
    res.status(409);
    throw new Error('Encomenda já paga');
  }

  const ref = String(order._id).slice(-6).toUpperCase();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: `Encomenda #${ref} - ElSircários Tech Store` },
          unit_amount: Math.round(order.total * 100), // em cêntimos
        },
        quantity: 1,
      },
    ],
    success_url: `${env.clientUrl}/encomendas/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/encomendas/${order._id}`,
  });

  order.stripeSessionId = session.id;
  await order.save();
  res.json({ success: true, url: session.url });
});

/** POST /api/payments/confirm - confirma o pagamento de uma sessão (no regresso). */
export const confirmPayment = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Pagamento online não está configurado');
  }

  const { sessionId } = req.body;
  // Sem isto, um sessionId vazio casaria com encomendas sem checkout (default '').
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400);
    throw new Error('sessionId em falta');
  }
  const order = await Order.findOne({ stripeSessionId: sessionId });
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (String(order.cliente) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Sem permissão');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === 'paid' && !order.pago) {
    order.pago = true;
    await order.save();
  }
  res.json({ success: true, pago: order.pago });
});

/** Carrega a encomenda do próprio cliente (ou lança). */
async function ownOrder(req, res) {
  const order = await Order.findById(req.params.orderId);
  if (!order || String(order.cliente) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (order.pago) {
    res.status(409);
    throw new Error('Encomenda já paga');
  }
  if (order.estado === 'cancelada' || order.estado === 'entregue') {
    res.status(409);
    throw new Error('A encomenda já está fechada');
  }
  return order;
}

/** POST /api/payments/mbway/:orderId - pagamento MB WAY (simulado). */
export const payMbway = asyncHandler(async (req, res) => {
  const order = await ownOrder(req, res);
  // Simulação: na vida real o cliente confirmaria no telemóvel.
  order.metodoPagamento = 'mbway';
  order.pago = true;
  await order.save();
  res.json({ success: true, pago: true });
});

/** POST /api/payments/multibanco/:orderId/confirmar - confirma pagamento MB (simulado). */
export const confirmMultibanco = asyncHandler(async (req, res) => {
  const order = await ownOrder(req, res);
  order.pago = true;
  await order.save();
  res.json({ success: true, pago: true });
});

/**
 * POST /api/payments/cartao/:orderId - pagamento por cartão (simulado).
 * Os dados do cartão chegam apenas para realismo do formulário e nunca são
 * guardados. Em produção isto seria delegado ao Stripe (ver createCheckout).
 */
export const payCartao = asyncHandler(async (req, res) => {
  const order = await ownOrder(req, res);
  order.metodoPagamento = 'cartao';
  order.pago = true;
  await order.save();
  res.json({ success: true, pago: true });
});

/**
 * POST /api/payments/paypal/:orderId - pagamento PayPal (simulado).
 * Usado quando o PayPal não está configurado (sem Client ID/Secret).
 */
export const payPaypal = asyncHandler(async (req, res) => {
  const order = await ownOrder(req, res);
  order.metodoPagamento = 'paypal';
  order.pago = true;
  await order.save();
  res.json({ success: true, pago: true });
});

/**
 * POST /api/payments/paypal/:orderId/create - cria uma ordem PayPal real
 * (sandbox) e devolve a URL de aprovação para onde redirecionar o cliente.
 */
export const createPaypalCheckout = asyncHandler(async (req, res) => {
  if (!paypalAtivo()) {
    res.status(503);
    throw new Error('PayPal não está configurado');
  }
  const order = await ownOrder(req, res);
  const ref = String(order._id).slice(-6).toUpperCase();
  const { id, approveUrl } = await createPaypalOrder({
    total: order.total,
    ref,
    // Regresso para uma página pública (sem guard) que captura o pagamento.
    // O PayPal acrescenta ?token=<paypalOrderId>&PayerID=...
    returnUrl: `${env.clientUrl}/pagamento/paypal`,
    cancelUrl: `${env.clientUrl}/encomendas/${order._id}`,
  });
  order.metodoPagamento = 'paypal';
  order.paypalOrderId = id;
  await order.save();
  res.json({ success: true, url: approveUrl });
});

/**
 * POST /api/payments/paypal/confirm - captura a ordem PayPal no regresso.
 * Pública: identificada pelo id da ordem PayPal (devolvido pelo PayPal no URL).
 * A captura é idempotente e só finaliza um pagamento já aprovado pelo comprador.
 */
export const confirmPaypal = asyncHandler(async (req, res) => {
  if (!paypalAtivo()) {
    res.status(503);
    throw new Error('PayPal não está configurado');
  }
  const { paypalOrderId } = req.body;
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    res.status(400);
    throw new Error('paypalOrderId em falta');
  }
  const order = await Order.findOne({ paypalOrderId });
  if (!order) {
    res.status(404);
    throw new Error('Encomenda não encontrada');
  }
  if (!order.pago) {
    const { ok } = await capturePaypalOrder(paypalOrderId);
    if (ok) {
      order.pago = true;
      await order.save();
    }
  }
  res.json({ success: true, pago: order.pago, orderId: String(order._id) });
});
