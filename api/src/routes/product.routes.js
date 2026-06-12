import { Router } from 'express';
import { body } from 'express-validator';
import {
  listProducts,
  getProduct,
  compareProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import {
  listProductReviews,
  myReviewStatus,
  createProductReview,
} from '../controllers/productReview.controller.js';
import { auth, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { productRules } from '../validators/catalog.validator.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = Router();
const loja = [auth, authorize('loja', 'admin')];

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Indica de 1 a 5 estrelas'),
  body('comentario').optional().trim().isLength({ max: 1000 }),
];

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Produtos]
 *     summary: Lista produtos (pesquisa, filtro, ordenação, paginação)
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Pesquisa por nome/EAN/marca }
 *       - { in: query, name: categoria, schema: { type: string }, description: ID de categoria (inclui subcategorias) }
 *       - { in: query, name: minPreco, schema: { type: number } }
 *       - { in: query, name: maxPreco, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [preco, -preco, nome, -nome, recentes] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12 } }
 *     responses:
 *       200: { description: Página de produtos + metadados de paginação }
 */
router.get('/', listProducts);

/**
 * @openapi
 * /api/products/compare:
 *   get:
 *     tags: [Produtos]
 *     summary: Compara 2-3 produtos da mesma categoria
 *     parameters:
 *       - { in: query, name: ids, required: true, schema: { type: string }, description: IDs separados por vírgula }
 *     responses:
 *       200: { description: Produtos + chaves de atributos alinhadas }
 *       400: { description: Categorias diferentes ou número inválido }
 */
router.get('/compare', compareProducts);

/**
 * @openapi
 * /api/products/{idOrSlug}:
 *   get:
 *     tags: [Produtos]
 *     summary: Detalhe de um produto (por id ou slug)
 *     parameters:
 *       - { in: path, name: idOrSlug, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Produto }
 *       404: { description: Não encontrado }
 */
router.get('/:idOrSlug', getProduct);

/**
 * @openapi
 * /api/products/{idOrSlug}/reviews:
 *   get:
 *     tags: [Produtos]
 *     summary: Avaliações de um produto + resumo (média e total)
 *     parameters:
 *       - { in: path, name: idOrSlug, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Lista de avaliações }
 *   post:
 *     tags: [Produtos]
 *     summary: Avaliar um produto (cliente que o comprou e recebeu)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: idOrSlug, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comentario: { type: string }
 *     responses:
 *       201: { description: Avaliação criada }
 *       403: { description: Não comprou o produto }
 *       409: { description: Já avaliou }
 */
router.get('/:idOrSlug/reviews', listProductReviews);
router.get('/:idOrSlug/reviews/me', auth, authorize('cliente'), myReviewStatus);
router.post(
  '/:idOrSlug/reviews',
  auth,
  authorize('cliente'),
  reviewRules,
  validate,
  createProductReview
);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Produtos]
 *     summary: Cria produto com imagens (loja)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               ean: { type: string }
 *               nome: { type: string }
 *               categoria: { type: string }
 *               preco: { type: number }
 *               stock: { type: integer }
 *               atributos: { type: string, description: JSON de especificações }
 *               imagemDestaque: { type: string, format: binary }
 *               imagens: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: Produto criado }
 *       409: { description: EAN duplicado }
 */
router.post('/', loja, uploadProductImages, productRules, validate, createProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Produtos]
 *     summary: Atualiza produto (loja)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Produto atualizado }
 *   delete:
 *     tags: [Produtos]
 *     summary: Remove produto (loja)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Produto removido }
 */
router.put('/:id', loja, uploadProductImages, updateProduct);
router.delete('/:id', loja, deleteProduct);

export default router;
