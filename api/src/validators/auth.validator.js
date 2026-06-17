import { body } from 'express-validator';

export const registerRules = [
  body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve ter pelo menos 6 caracteres'),
  body('morada').trim().notEmpty().withMessage('Morada obrigatória'),
  body('telefone').trim().notEmpty().withMessage('Telefone obrigatório'),
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
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('A nova password deve ter pelo menos 6 caracteres'),
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
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova password deve ter pelo menos 6 caracteres'),
];

export const profileRules = [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ficar vazio'),
  body('morada').optional().trim().notEmpty().withMessage('Morada não pode ficar vazia'),
  body('telefone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Telefone não pode ficar vazio'),
];
