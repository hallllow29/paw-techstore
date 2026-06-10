/** Apanha rotas inexistentes e encaminha para o errorHandler. */
export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}
