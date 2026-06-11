/**
 * Carrega e valida variáveis de ambiente.
 * Regra de ouro do projeto: NADA de connection strings ou segredos hardcoded.
 * Tudo vem do .env (ver .env.example). Isto garante portabilidade — a mesma
 * app corre contra Atlas (entrega) ou Docker/local (dev) só mudando o .env.
 */
import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback = undefined) {
  // eslint-disable-next-line security/detect-object-injection -- `name` é literal interno, não input do utilizador
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `[config] Variável de ambiente obrigatória em falta: ${name}. ` +
        `Copia api/.env.example para api/.env e preenche os valores.`
    );
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),

  // BD — sempre via env (Atlas no zip, Docker/local em dev)
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/paw-techstore'),

  // Auth (usado a partir da Fase 1)
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',

  // CORS — origem do cliente Angular
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:4200',

  // Email (opcional). Sem SMTP configurado, usa-se uma conta de teste Ethereal.
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'paw-techstore <no-reply@paw-techstore.pt>',

  // Pagamentos Stripe (opcional). Sem chave, o pagamento online fica desativado.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
};

export const stripeEnabled = Boolean(env.stripeSecretKey);

export const isProd = env.nodeEnv === 'production';
