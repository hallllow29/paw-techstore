import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/user.model.js';

/**
 * Exige um JWT válido no header Authorization: Bearer <token>.
 * Anexa o utilizador autenticado a req.user.
 */
export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      res.status(401);
      throw new Error('Não autenticado: token em falta');
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401);
      throw new Error('Não autenticado: utilizador inexistente');
    }

    // Conta suspensa: invalida o token de imediato (mesmo que ainda válido)
    if (user.status === 'banido') {
      res.status(403);
      throw new Error('Conta suspensa. Contacta o administrador.');
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(res.statusCode === 200 ? 401 : res.statusCode);
    next(err);
  }
}

/**
 * Restringe o acesso a determinados roles.
 * Uso: router.get('/admin', auth, authorize('admin'), handler)
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error('Sem permissão para esta ação'));
    }
    next();
  };
}
