/**
 * Seed da base de dados.  Corre com:  npm run seed
 *
 * Popula utilizadores, categorias e produtos de demonstração.
 * Idempotente: limpa e recria tudo.
 *
 * Utilizadores (password: demo1234):
 *   admin@paw.pt · loja@paw.pt · estafeta1@paw.pt (ativo) ·
 *   estafeta2@paw.pt (pendente) · ana@paw.pt · rui@paw.pt
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/user.model.js';
import { Category } from '../models/category.model.js';
import { Product } from '../models/product.model.js';
import { assignProductImages } from './product-images.js';
import { assignProductSpecs } from './product-specs.js';

const PWD = 'demo1234';

const users = [
  { nome: 'Administrador', email: 'admin@paw.pt', role: 'admin', status: 'ativo' },
  { nome: 'Loja PAW', email: 'loja@paw.pt', role: 'loja', status: 'ativo' },
  {
    nome: 'Estafeta Aprovado',
    email: 'estafeta1@paw.pt',
    role: 'estafeta',
    status: 'ativo',
  },
  {
    nome: 'Estafeta Pendente',
    email: 'estafeta2@paw.pt',
    role: 'estafeta',
    status: 'pendente',
  },
  { nome: 'Ana Cliente', email: 'ana@paw.pt', role: 'cliente', status: 'ativo' },
  { nome: 'Rui Cliente', email: 'rui@paw.pt', role: 'cliente', status: 'ativo' },
];

try {
  await connectDB();
  logger.info('A limpar coleções...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);

  // ── Utilizadores ── (contas de demonstração já com email confirmado)
  // Telemóveis distintos: o login por SMS identifica a conta pelo número.
  for (const [i, u] of users.entries()) {
    await User.create({
      ...u,
      password: PWD,
      morada: 'Rua de Exemplo, 123, Porto',
      telefone: `91000000${i}`,
      emailVerificado: true,
    });
  }

  // ── Categorias (hierárquicas) ──
  const computadores = await Category.create({ nome: 'Computadores' });
  const portateis = await Category.create({
    nome: 'Portáteis',
    parent: computadores._id,
  });
  const desktops = await Category.create({ nome: 'Desktops', parent: computadores._id });
  const smartphones = await Category.create({ nome: 'Smartphones' });
  const dispositivos = await Category.create({ nome: 'Dispositivos' });
  const teclados = await Category.create({ nome: 'Teclados', parent: dispositivos._id });
  const ratos = await Category.create({ nome: 'Ratos', parent: dispositivos._id });
  const monitores = await Category.create({ nome: 'Monitores' });

  // ── Produtos ──
  const products = [
    {
      ean: '4711636338417',
      nome: 'Portátil ASUS Vivobook 15 F1504VA',
      marca: 'ASUS',
      categoria: portateis._id,
      preco: 599.99,
      precoAntigo: 699.99,
      stock: 12,
      descricao: 'Portátil 15.6" para o dia a dia, leve e equilibrado.',
      atributos: {
        Ecrã: '15.6"',
        CPU: 'Intel Core i7 150U',
        RAM: '16 GB',
        Armazenamento: '1 TB SSD',
        SO: 'Windows 11',
      },
    },
    {
      ean: '0199896577045',
      nome: 'Portátil HP 14-ha0003np',
      marca: 'HP',
      categoria: portateis._id,
      preco: 799.99,
      stock: 7,
      descricao: 'Portátil 14" com Ryzen AI, ideal para produtividade.',
      atributos: {
        Ecrã: '14"',
        CPU: 'AMD Ryzen AI 7 350',
        RAM: '24 GB',
        Armazenamento: '1 TB SSD',
        SO: 'Windows 11',
      },
    },
    {
      ean: '4711474460080',
      nome: 'Portátil ACER Chromebook 315',
      marca: 'ACER',
      categoria: portateis._id,
      preco: 259.99,
      stock: 20,
      descricao: 'Chromebook acessível para tarefas leves e web.',
      atributos: {
        Ecrã: '15.6"',
        CPU: 'Intel Celeron N4500',
        RAM: '8 GB',
        Armazenamento: '128 GB eMMC',
        SO: 'ChromeOS',
      },
    },
    {
      ean: '8806094938247',
      nome: 'Monitor Samsung Odyssey G5 27"',
      marca: 'Samsung',
      categoria: monitores._id,
      preco: 219.99,
      stock: 15,
      descricao: 'Monitor curvo 27" 165Hz para gaming.',
      atributos: {
        Polegadas: '27"',
        Resolução: '2560x1440',
        Taxa: '165 Hz',
        Painel: 'VA',
      },
    },
    {
      ean: '5099206082434',
      nome: 'Teclado Logitech MX Keys S',
      marca: 'Logitech',
      categoria: teclados._id,
      preco: 109.99,
      stock: 30,
      descricao: 'Teclado sem fios premium para produtividade.',
      atributos: { Tipo: 'Membrana', Ligação: 'Bluetooth/USB', Layout: 'PT' },
    },
    {
      ean: '5099206099142',
      nome: 'Rato Logitech MX Master 3S',
      marca: 'Logitech',
      categoria: ratos._id,
      preco: 99.99,
      stock: 25,
      descricao: 'Rato ergonómico de alta precisão.',
      atributos: { DPI: '8000', Ligação: 'Bluetooth/USB', Botões: '7' },
    },
    {
      ean: '6901443394746',
      nome: 'Smartphone Xiaomi Redmi Note 13',
      marca: 'Xiaomi',
      categoria: smartphones._id,
      preco: 199.99,
      precoAntigo: 249.99,
      stock: 18,
      descricao: 'Smartphone com excelente relação qualidade/preço.',
      atributos: {
        Ecrã: '6.67"',
        RAM: '8 GB',
        Armazenamento: '256 GB',
        Bateria: '5000 mAh',
      },
    },
    {
      ean: '4711387431290',
      nome: 'Desktop Lenovo IdeaCentre 3',
      marca: 'Lenovo',
      categoria: desktops._id,
      preco: 549.99,
      stock: 9,
      descricao: 'Torre compacta para casa e escritório.',
      atributos: {
        CPU: 'Intel Core i5 12400',
        RAM: '16 GB',
        Armazenamento: '512 GB SSD',
        SO: 'Windows 11',
      },
    },
  ];

  for (const p of products) await Product.create(p);

  // Especificações técnicas ricas (fonte única em product-specs.js)
  await assignProductSpecs();

  // Imagens: fotos reais (seed-assets) ou placeholders on-brand
  await assignProductImages();

  logger.info(
    `Seed OK: ${users.length} utilizadores, 8 categorias, ${products.length} produtos (password: ${PWD}).`
  );
  await disconnectDB();
} catch (err) {
  logger.error(`Seed falhou: ${err.message}`);
  process.exit(1);
}
