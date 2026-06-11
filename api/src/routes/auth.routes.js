import { Router } from 'express';
import {
  register,
  login,
  me,
  changePassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerRules,
  loginRules,
  changePasswordRules,
  profileRules,
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
