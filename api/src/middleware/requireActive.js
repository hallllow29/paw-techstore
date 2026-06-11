/**
 * Exige que a conta esteja 'ativo'. Bloqueia estafetas pendentes/rejeitados
 * de operarem (aceitar/concluir entregas) até serem aprovados pelo admin.
 * Usar depois de `auth`.
 */
export function requireActive(req, res, next) {
  if (req.user.status !== 'ativo') {
    res.status(403);
    return next(new Error('A tua conta ainda não foi aprovada pelo administrador.'));
  }
  next();
}
