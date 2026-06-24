import { isProd } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Tratamento de erros centralizado (último middleware da cadeia).
 * Normaliza a resposta de erro e esconde stack traces em produção.
 */
// eslint-disable-next-line no-unused-vars -- Express identifica error handlers por 4 args
export function errorHandler(err, req, res, next) {
  // Estado definido pelo controller (ex.: res.status(409)) tem prioridade.
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let detalhe = err.message || 'Erro interno do servidor';

  // Normaliza erros conhecidos do Mongoose para 4xx (em vez de 500): um :id
  // malformado, dados que falham a validação do schema, ou um índice único
  // violado são erros do CLIENTE, não do servidor.
  if (status === 500) {
    if (err.name === 'CastError') {
      status = 400;
      detalhe = `Identificador inválido: ${err.value}`;
    } else if (err.name === 'ValidationError') {
      status = 400;
      detalhe =
        Object.values(err.errors)
          .map((e) => e.message)
          .join('; ') || 'Dados inválidos';
    } else if (err.code === 11000) {
      status = 409;
      const campo = Object.keys(err.keyValue ?? {})[0] ?? 'valor';
      detalhe = `Já existe um registo com esse ${campo}`;
    }
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  // Erros 4xx são intencionais (mensagem útil). Em 5xx, não expor detalhes
  // internos em produção (fuga de implementação/stack).
  const mensagem = status >= 500 && isProd ? 'Erro interno do servidor' : detalhe;

  res.status(status).json({
    success: false,
    message: mensagem,
    ...(isProd ? {} : { stack: err.stack }),
  });
}
