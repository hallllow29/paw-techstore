import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Integração PayPal (Orders v2 REST). Ativada quando há PAYPAL_CLIENT_ID +
 * PAYPAL_SECRET no .env (sandbox por defeito). Sem credenciais, o checkout
 * PayPal cai no modo simulado (ver payment.controller).
 */
const apiBase = () =>
  env.paypalMode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const paypalAtivo = () => Boolean(env.paypalClientId && env.paypalSecret);

/** Obtém um access token OAuth2 (client credentials). */
async function getAccessToken() {
  const auth = Buffer.from(`${env.paypalClientId}:${env.paypalSecret}`).toString(
    'base64'
  );
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Autenticação PayPal falhou');
  const data = await res.json();
  return data.access_token;
}

/** Cria uma ordem PayPal e devolve o id + URL de aprovação. */
export async function createPaypalOrder({ total, ref, returnUrl, cancelUrl }) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'EUR', value: total.toFixed(2) },
          description: `Encomenda #${ref} — ElSircários Tech Store`,
        },
      ],
      application_context: {
        brand_name: 'ElSircários Tech Store',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    logger.warn(`PayPal create falhou: ${JSON.stringify(data)}`);
    throw new Error('Não foi possível criar o pagamento PayPal');
  }
  const approveUrl = data.links?.find((l) => l.rel === 'approve')?.href;
  return { id: data.id, approveUrl };
}

/** Captura (cobra) uma ordem PayPal previamente aprovada. */
export async function capturePaypalOrder(paypalOrderId) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.status === 'COMPLETED', status: data.status };
}
