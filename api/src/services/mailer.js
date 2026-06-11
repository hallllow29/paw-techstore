import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    if (env.smtpHost) {
      return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
      });
    }
    // Sem SMTP: conta de teste Ethereal (emails ficam em preview, não saem).
    const test = await nodemailer.createTestAccount();
    logger.info('Mailer em modo Ethereal (dev) — os emails geram um link de preview.');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: test.user, pass: test.pass },
    });
  })();
  return transporterPromise;
}

/**
 * Envia um email. Best-effort: falhas apenas registam um aviso.
 * Saltado em ambiente de testes.
 */
export async function sendMail({ to, subject, html }) {
  if (env.nodeEnv === 'test') return;
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: env.mailFrom, to, subject, html });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) logger.info(`Email para ${to} — preview: ${preview}`);
  } catch (err) {
    logger.warn(`Falha ao enviar email para ${to}: ${err.message}`);
  }
}
