import { User } from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** POST /api/auth/register — auto-registo de cliente ou estafeta. */
export const register = asyncHandler(async (req, res) => {
  const { nome, email, password, morada, telefone, role } = req.body;

  if (await User.exists({ email })) {
    res.status(409);
    throw new Error('Já existe uma conta com este email');
  }

  const finalRole = role === 'estafeta' ? 'estafeta' : 'cliente';
  // Estafetas precisam de aprovação do admin antes de operar
  const status = finalRole === 'estafeta' ? 'pendente' : 'ativo';

  const user = await User.create({
    nome,
    email,
    password,
    morada,
    telefone,
    role: finalRole,
    status,
  });
  const token = signToken(user);

  res.status(201).json({ success: true, token, user });
});

/** POST /api/auth/login — autentica e devolve um JWT. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // password tem select:false → pedir explicitamente
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Credenciais inválidas');
  }

  if (user.status === 'rejeitado') {
    res.status(403);
    throw new Error('Conta rejeitada. Contacta o administrador.');
  }

  const token = signToken(user);
  res.json({ success: true, token, user });
});

/** GET /api/auth/me — perfil do utilizador autenticado. */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

/** PATCH /api/auth/password — altera a própria password. */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Password atual incorreta');
  }

  user.password = newPassword; // o pre-save faz o hash
  await user.save();

  res.json({ success: true, message: 'Password alterada com sucesso' });
});
