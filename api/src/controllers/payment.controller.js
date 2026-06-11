import { getStripe } from '../services/stripe.js';
import { Order } from '../models/order.model.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/payments/config — indica se o pagamento online está disponível. */
export const paymentConfig = asyncHandler(async (_req, res) => {
  res.json({ success: true, enabled: Boolean(getStripe()) });
});

/** POST /api/payments/checkout/:orderId — cria uma sessão de Checkout Stripe. */
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
          product_data: { name: `Encomenda #${ref} — paw-techstore` },
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

/** POST /api/payments/confirm — confirma o pagamento de uma sessão (no regresso). */
export const confirmPayment = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Pagamento online não está configurado');
  }

  const { sessionId } = req.body;
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
