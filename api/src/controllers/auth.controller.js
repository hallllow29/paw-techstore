import bcrypt from 'bcryptjs';
import { randomInt, randomBytes, createHash } from 'node:crypto';
import { User } from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMail } from '../services/mailer.js';
import { sendSms } from '../services/sms.js';
import { toPublicPath } from '../middleware/upload.js';
import { env } from '../config/env.js';

const OTP_TTL_MIN = 10; // validade do código
const OTP_MAX_ATTEMPTS = 5; // tentativas antes de obrigar a pedir novo
const STATUS_BLOQUEADO = new Set(['rejeitado', 'banido']); // sem acesso por OTP/reset
const EMAIL_TOKEN_TTL_H = 24; // validade do link de confirmação de email

function gerarCodigoOtp() {
  return String(randomInt(100000, 1000000)); // sempre 6 dígitos
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function verifyEmailHtml(nome, link) {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px">
    <h2 style="color:#2563eb;margin:0 0 8px">ElSircários Tech Store</h2>
    <p>Olá ${nome}, bem-vindo(a)! Confirma o teu email para ativares todas as funcionalidades da conta:</p>
    <p style="margin:20px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Confirmar email</a></p>
    <p style="color:#666;font-size:13px">Ou copia este endereço para o navegador:<br><span style="word-break:break-all">${link}</span></p>
    <p style="color:#666;font-size:13px">O link é válido por ${EMAIL_TOKEN_TTL_H} horas. Se não foste tu a criar a conta, ignora este email.</p>
  </div>`;
}

/**
 * Gera um novo token de confirmação, guarda o hash no utilizador e envia o
 * email com o link. Best-effort no envio (não bloqueia o registo).
 * Devolve o token em claro (só usado em ambiente de testes).
 */
async function enviarConfirmacaoEmail(user) {
  const token = randomBytes(32).toString('hex');
  user.emailTokenHash = hashToken(token);
  user.emailTokenExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_H * 60 * 60 * 1000);
  await user.save();

  const link = `${env.clientUrl}/confirmar-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Confirma o teu email — ElSircários Tech Store',
    html: verifyEmailHtml(user.nome, link),
  });
  return token;
}

function otpEmailHtml(nome, codigo, acao = 'entrares na ElSircários Tech Store') {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px">
    <h2 style="margin:0 0 8px">O teu código</h2>
    <p>Olá ${nome}, usa este código para ${acao}:</p>
    <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:16px 0">${codigo}</p>
    <p style="color:#666;font-size:14px">Válido por ${OTP_TTL_MIN} minutos. Se não foste tu a pedir, ignora este email.</p>
  </div>`;
}

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

  // Envia o email de confirmação (best-effort — não bloqueia o registo)
  const emailToken = await enviarConfirmacaoEmail(user);

  const token = signToken(user);
  const payload = { success: true, token, user };
  // Só em testes devolvemos o token do email (em produção iria por email).
  if (env.nodeEnv === 'test') payload.devEmailToken = emailToken;
  res.status(201).json(payload);
});

/** POST /api/auth/email/verify — confirma o email a partir do token do link. */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findOne({
    emailTokenHash: hashToken(String(token)),
    emailTokenExpiresAt: { $gt: new Date() },
  }).select('+emailTokenHash +emailTokenExpiresAt');

  if (!user) {
    res.status(400);
    throw new Error('Link de confirmação inválido ou expirado');
  }

  user.emailVerificado = true;
  user.emailTokenHash = null;
  user.emailTokenExpiresAt = null;
  await user.save();

  res.json({ success: true, message: 'Email confirmado com sucesso', user });
});

/** POST /api/auth/email/resend — reenvia o email de confirmação (autenticado). */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  if (user.emailVerificado) {
    return res.json({ success: true, message: 'O teu email já está confirmado.' });
  }

  const emailToken = await enviarConfirmacaoEmail(user);
  const payload = { success: true, message: 'Email de confirmação reenviado.' };
  if (env.nodeEnv === 'test') payload.devEmailToken = emailToken;
  res.json(payload);
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
  if (user.status === 'banido') {
    res.status(403);
    throw new Error('Conta suspensa. Contacta o administrador.');
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
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Password atual incorreta');
  }

  user.password = newPassword; // o pre-save faz o hash
  await user.save();

  res.json({ success: true, message: 'Password alterada com sucesso' });
});

/** PATCH /api/auth/me — atualiza os próprios dados (nome, morada, telefone). */
export const updateProfile = asyncHandler(async (req, res) => {
  const { nome, morada, telefone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  if (nome !== undefined) user.nome = nome;
  if (morada !== undefined) user.morada = morada;
  if (telefone !== undefined) user.telefone = telefone;
  await user.save();
  res.json({ success: true, user });
});

/** PATCH /api/auth/avatar — atualiza a foto de perfil (multipart, campo "avatar"). */
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Nenhuma imagem enviada');
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('Utilizador não encontrado');
  }
  user.avatar = toPublicPath(req.file);
  await user.save();
  res.json({ success: true, user });
});

/** POST /api/auth/otp/request — envia um código de acesso por email (só clientes). */
export const requestOtp = asyncHandler(async (req, res) => {
  const { email, canal } = req.body;
  const porSms = canal === 'sms';
  const user = await User.findOne({ email });

  // Resposta genérica para não revelar se a conta existe.
  const generic = {
    success: true,
    message: porSms
      ? 'Se existir uma conta de cliente com esse email, enviámos um código por SMS.'
      : 'Se existir uma conta de cliente com esse email, enviámos um código.',
  };

  // Só clientes usam OTP; os restantes papéis mantêm a password.
  if (user?.role !== 'cliente' || STATUS_BLOQUEADO.has(user?.status)) {
    return res.json(generic);
  }

  const codigo = gerarCodigoOtp();
  user.otpHash = await bcrypt.hash(codigo, 10);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  user.otpAttempts = 0;
  user.otpPurpose = 'login';
  await user.save();

  if (porSms) {
    await sendSms({
      to: user.telefone,
      text: `ElSircarios: o teu codigo de acesso e ${codigo} (valido ${OTP_TTL_MIN} min).`,
    });
  } else {
    await sendMail({
      to: user.email,
      subject: 'O teu código de acesso — ElSircários Tech Store',
      html: otpEmailHtml(user.nome, codigo),
    });
  }

  // O código segue por email/SMS. Só em ambiente de testes é devolvido na resposta
  // (em dev/produção isso permitiria account takeover e enumeração de contas).
  if (env.nodeEnv === 'test') return res.json({ ...generic, devCode: codigo });
  return res.json(generic);
});

/** POST /api/auth/otp/verify — valida o código e devolve um JWT. */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email }).select(
    '+otpHash +otpExpiresAt +otpAttempts +otpPurpose'
  );

  const temOtp =
    user?.role === 'cliente' && Boolean(user?.otpHash) && user?.otpPurpose === 'login';
  const expirado = !user?.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now();

  if (temOtp && user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    res.status(429);
    throw new Error('Demasiadas tentativas. Pede um novo código.');
  }

  const valido =
    temOtp && !expirado && (await bcrypt.compare(String(code), user.otpHash));

  if (!valido) {
    if (temOtp && !expirado) {
      user.otpAttempts += 1;
      await user.save();
    }
    res.status(401);
    throw new Error('Código inválido ou expirado');
  }

  // Sucesso: limpar o OTP (não pode ser reutilizado) e emitir o token.
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpPurpose = null;
  await user.save();

  const token = signToken(user);
  res.json({ success: true, token, user });
});

/** POST /api/auth/password/forgot — envia código para repor a password (qualquer papel). */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, canal } = req.body;
  const porSms = canal === 'sms';
  const user = await User.findOne({ email });

  const generic = {
    success: true,
    message: 'Se a conta existir, enviámos um código para repor a password.',
  };
  if (!user || STATUS_BLOQUEADO.has(user.status)) return res.json(generic);

  const codigo = gerarCodigoOtp();
  user.otpHash = await bcrypt.hash(codigo, 10);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  user.otpAttempts = 0;
  user.otpPurpose = 'reset';
  await user.save();

  if (porSms) {
    await sendSms({
      to: user.telefone,
      text: `ElSircarios: codigo para repor a password ${codigo} (valido ${OTP_TTL_MIN} min).`,
    });
  } else {
    await sendMail({
      to: user.email,
      subject: 'Repor a password — ElSircários Tech Store',
      html: otpEmailHtml(user.nome, codigo, 'repores a tua password'),
    });
  }

  if (env.nodeEnv === 'test') return res.json({ ...generic, devCode: codigo });
  return res.json(generic);
});

/** POST /api/auth/password/reset — valida o código e define a nova password. */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({ email }).select(
    '+otpHash +otpExpiresAt +otpAttempts +otpPurpose'
  );

  const temOtp = Boolean(user?.otpHash) && user?.otpPurpose === 'reset';
  const expirado = !user?.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now();

  if (temOtp && user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    res.status(429);
    throw new Error('Demasiadas tentativas. Pede um novo código.');
  }

  const valido =
    temOtp && !expirado && (await bcrypt.compare(String(code), user.otpHash));
  if (!valido) {
    if (temOtp && !expirado) {
      user.otpAttempts += 1;
      await user.save();
    }
    res.status(401);
    throw new Error('Código inválido ou expirado');
  }

  user.password = newPassword; // o pre-save faz o hash
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpPurpose = null;
  await user.save();

  const token = signToken(user);
  res.json({ success: true, token, user });
});
