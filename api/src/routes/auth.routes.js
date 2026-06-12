import { Router } from 'express';
import {
  register,
  login,
  me,
  changePassword,
  updateProfile,
  requestOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerRules,
  loginRules,
  changePasswordRules,
  profileRules,
  otpRequestRules,
  otpVerifyRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registo de cliente ou estafeta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, password, morada, telefone]
 *             properties:
 *               nome: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               morada: { type: string }
 *               telefone: { type: string }
 *               role: { type: string, enum: [cliente, estafeta] }
 *     responses:
 *       201: { description: Conta criada (devolve token + user) }
 *       409: { description: Email já registado }
 *       422: { description: Dados inválidos }
 */
router.post('/register', registerRules, validate, register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (devolve JWT)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Autenticado (token + user) }
 *       401: { description: Credenciais inválidas }
 */
router.post('/login', loginRules, validate, login);

/**
 * @openapi
 * /api/auth/otp/request:
 *   post:
 *     tags: [Auth]
 *     summary: Pede um código de acesso por email (login sem password, só clientes)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: "Resposta genérica (não revela se a conta existe)" }
 */
router.post('/otp/request', otpRequestRules, validate, requestOtp);

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Valida o código de acesso e devolve um JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Autenticado (token + user) }
 *       401: { description: Código inválido ou expirado }
 *       429: { description: Demasiadas tentativas }
 */
router.post('/otp/verify', otpVerifyRules, validate, verifyOtp);

/**
 * @openapi
 * /api/auth/password/forgot:
 *   post:
 *     tags: [Auth]
 *     summary: Pede um código para repor a password (email ou SMS)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               canal: { type: string, enum: [email, sms] }
 *     responses:
 *       200: { description: "Resposta genérica" }
 */
router.post('/password/forgot', forgotPasswordRules, validate, forgotPassword);

/**
 * @openapi
 * /api/auth/password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Valida o código e define a nova password (devolve JWT)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, example: "123456" }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password reposta (token + user) }
 *       401: { description: Código inválido ou expirado }
 */
router.post('/password/reset', resetPasswordRules, validate, resetPassword);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil do utilizador autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Utilizador atual }
 *       401: { description: Não autenticado }
 */
router.get('/me', auth, me);

/**
 * @openapi
 * /api/auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Atualiza os próprios dados (nome, morada, telefone)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome: { type: string }
 *               morada: { type: string }
 *               telefone: { type: string }
 *     responses:
 *       200: { description: Perfil atualizado }
 */
router.patch('/me', auth, profileRules, validate, updateProfile);

/**
 * @openapi
 * /api/auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Alterar a própria password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password alterada }
 *       401: { description: Password atual incorreta }
 */
router.patch('/password', auth, changePasswordRules, validate, changePassword);

export default router;
