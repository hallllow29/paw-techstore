import { validationResult } from 'express-validator';

/**
 * Corre as validações do express-validator e devolve 422 com os erros,
 * caso existam. Colocar a seguir às cadeias de validação na rota.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(422);
  next(
    new Error(
      errors
        .array()
        .map((e) => e.msg)
        .join('; ')
    )
  );
}
