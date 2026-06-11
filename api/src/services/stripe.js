import Stripe from 'stripe';
import { env } from '../config/env.js';

let client = null;

/** Devolve o cliente Stripe, ou null se não houver chave configurada. */
export function getStripe() {
  if (!env.stripeSecretKey) return null;
  client ??= new Stripe(env.stripeSecretKey);
  return client;
}
