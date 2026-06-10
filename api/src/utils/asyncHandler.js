/**
 * Envolve um handler async e encaminha erros para o errorHandler,
 * evitando try/catch repetido em cada controller.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
