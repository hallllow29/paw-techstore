import { body } from 'express-validator';

export const categoryRules = [
  body('nome').trim().notEmpty().withMessage('Nome da categoria obrigatório'),
  body('parent')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Categoria-mãe inválida'),
];

export const productRules = [
  body('ean').trim().notEmpty().withMessage('EAN obrigatório'),
  body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  body('categoria').isMongoId().withMessage('Categoria inválida'),
  body('preco').isFloat({ min: 0 }).withMessage('Preço inválido'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido'),
];
