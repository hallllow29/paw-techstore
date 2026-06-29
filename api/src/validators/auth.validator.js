import { body } from 'express-validator';

// Política de password: >= 8 caracteres, com pelo menos uma letra e um número.
const passwordForte = (campo) =>
  body(campo)
    .isLength({ min: 8 })
    .withMessage('A password deve ter pelo menos 8 caracteres')
    .matches(/[A-Za-z]/)
    .withMessage('A password deve conter pelo menos uma letra')
    .matches(/\d/)
    .withMessage('A password deve conter pelo menos um número');

// Telemóvel português: 9 dígitos a começar por 9 (com +351 opcional).
const TELEFONE_REGEX = /^(\+351)?\s?9\d{8}$/;

export const registerRules = [
  body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  passwordForte('password'),
  body('morada').trim().notEmpty().withMessage('Morada obrigatória'),
  body('telefone')
    .trim()
    .notEmpty()
    .withMessage('Telefone obrigatório')
    .matches(TELEFONE_REGEX)
    .withMessage('Telemóvel inválido (9 dígitos, ex.: 912345678)'),
  // Auto-registo só permite cliente ou estafeta (loja/admin são criados por seed)
  body('role')
    .optional()
    .isIn(['cliente', 'estafeta'])
    .withMessage('Role inválido no registo'),
];

export const loginRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Password obrigatória'),
];

export const otpRequestRules = [
  body('canal').optional().isIn(['email', 'sms']).withMessage('Canal inválido'),
  // Canal SMS identifica-se pelo telemóvel; os restantes pelo email.
  body('email')
    .if(body('canal').not().equals('sms'))
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('telefone')
    .if(body('canal').equals('sms'))
    .trim()
    .notEmpty()
    .withMessage('Indica o número de telemóvel da conta'),
];

export const otpVerifyRules = [
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('telefone').optional().trim().notEmpty(),
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('O código tem 6 dígitos')
    .isNumeric()
    .withMessage('Código inválido'),
];

export const forgotPasswordRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('canal').optional().isIn(['email', 'sms']).withMessage('Canal inválido'),
];

export const resetPasswordRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('O código tem 6 dígitos')
    .isNumeric()
    .withMessage('Código inválido'),
  passwordForte('newPassword'),
];

export const emailVerifyRules = [
  body('token')
    .isString()
    .withMessage('Token inválido')
    .trim()
    .isLength({ min: 32, max: 128 })
    .withMessage('Token inválido'),
];

export const resendVerificationRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Password atual obrigatória'),
  passwordForte('newPassword'),
];

export const profileRules = [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ficar vazio'),
  body('morada').optional().trim().notEmpty().withMessage('Morada não pode ficar vazia'),
  body('telefone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Telefone não pode ficar vazio')
    .matches(TELEFONE_REGEX)
    .withMessage('Telemóvel inválido (9 dígitos, ex.: 912345678)'),
];
