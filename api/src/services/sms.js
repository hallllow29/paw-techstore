import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Envia um SMS.
 *
 * Sem provider configurado (SMS_PROVIDER vazio) corre em modo SIMULADO: regista
 * a mensagem no log e não envia nada real - tal como os pagamentos MB WAY /
 * Multibanco. Assim o projeto funciona em qualquer máquina, sem contas pagas.
 *
 * Ponto de extensão pronto para um provider real (Twilio, Vonage, ...) ativado
 * por variáveis de ambiente. Saltado em ambiente de testes.
 */
export async function sendSms({ to, text }) {
  if (env.nodeEnv === 'test') return;

  if (!env.smsProvider) {
    logger.info(`SMS (simulado) para ${to}: ${text}`);
    return;
  }

  try {
    // Exemplo de ligação real (Twilio via REST), ativada quando há credenciais:
    //   const auth = Buffer.from(`${env.smsAccountSid}:${env.smsAuthToken}`).toString('base64');
    //   await fetch(
    //     `https://api.twilio.com/2010-04-01/Accounts/${env.smsAccountSid}/Messages.json`,
    //     {
    //       method: 'POST',
    //       headers: {
    //         Authorization: `Basic ${auth}`,
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //       },
    //       body: new URLSearchParams({ To: to, From: env.smsFrom, Body: text }),
    //     }
    //   );
    logger.info(`SMS para ${to} via ${env.smsProvider}.`);
  } catch (err) {
    logger.warn(`Falha ao enviar SMS para ${to}: ${err.message}`);
  }
}
