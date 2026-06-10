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

  res.status(status).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(isProd ? {} : { stack: err.stack }),
  });
}
