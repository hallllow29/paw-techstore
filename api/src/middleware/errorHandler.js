import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Tratamento de erros centralizado (último middleware da cadeia).
 * Normaliza a resposta de erro e esconde stack traces em produção.
 */
// eslint-disable-next-line no-unused-vars -- Express identifica error handlers por 4 args
export function errorHandler(err, req, res, next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  // Erros 4xx são intencionais (mensagem útil). Em 5xx, não expor detalhes
  // internos em produção (fuga de implementação/stack).
  const mensagem =
    status >= 500 && isProd
      ? 'Erro interno do servidor'
      : err.message || 'Erro interno do servidor';

  res.status(status).json({
    success: false,
    message: mensagem,
    ...(isProd ? {} : { stack: err.stack }),
  });
}
