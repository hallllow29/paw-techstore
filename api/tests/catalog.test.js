import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Category } from '../src/models/category.model.js';
import { Product } from '../src/models/product.model.js';

const app = createApp();
let mongo;
let cat = {};
let lojaToken;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Categorias: Computadores > Portáteis/Desktops ; Monitores
  cat.computadores = await Category.create({ nome: 'Computadores' });
  cat.portateis = await Category.create({
    nome: 'Portáteis',
    parent: cat.computadores._id,
  });
  cat.desktops = await Category.create({
    nome: 'Desktops',
    parent: cat.computadores._id,
  });
  cat.monitores = await Category.create({ nome: 'Monitores' });

  await Product.create([
    {
      ean: '111',
      nome: 'Portátil ASUS X',
      marca: 'ASUS',
      categoria: cat.portateis._id,
      preco: 600,
      stock: 5,
      atributos: { RAM: '16 GB', CPU: 'i7' },
    },
    {
      ean: '222',
      nome: 'Portátil HP Y',
      marca: 'HP',
      categoria: cat.portateis._id,
      preco: 800,
      stock: 3,
      atributos: { RAM: '24 GB', CPU: 'Ryzen' },
    },
    {
      ean: '333',
      nome: 'Desktop Lenovo Z',
      marca: 'Lenovo',
      categoria: cat.desktops._id,
      preco: 500,
      stock: 2,
      atributos: { RAM: '16 GB' },
    },
    {
      ean: '444',
      nome: 'Monitor Samsung',
      marca: 'Samsung',
      categoria: cat.monitores._id,
      preco: 200,
      stock: 9,
      atributos: { Polegadas: '27"' },
    },
  ]);

  // Utilizador loja para testar rotas protegidas
  await User.create({
    nome: 'Loja',
    email: 'loja@t.pt',
    password: 'loja1234',
    morada: 'x',
    telefone: '9loja',
    role: 'loja',
    emailVerificado: true,
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'loja@t.pt', password: 'loja1234' });
  lojaToken = login.body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('lista produtos com paginação', async () => {
  const res = await request(app).get('/api/products?limit=2&page=1');
  assert.equal(res.status, 200);
  assert.equal(res.body.products.length, 2);
  assert.equal(res.body.pagination.total, 4);
  assert.equal(res.body.pagination.pages, 2);
});

test('pesquisa por nome encontra o produto certo', async () => {
  const res = await request(app).get('/api/products?q=ASUS');
  assert.equal(res.body.products.length, 1);
  assert.equal(res.body.products[0].ean, '111');
});

test('ordena por preço ascendente', async () => {
  const res = await request(app).get('/api/products?sort=preco');
  const precos = res.body.products.map((p) => p.preco);
  assert.deepEqual(
    precos,
    [...precos].sort((a, b) => a - b)
  );
});

test('filtrar por categoria-pai inclui subcategorias', async () => {
  const res = await request(app).get(`/api/products?categoria=${cat.computadores._id}`);
  // 2 portáteis + 1 desktop = 3 (não inclui o monitor)
  assert.equal(res.body.pagination.total, 3);
});

test('comparador alinha atributos de produtos da mesma categoria', async () => {
  const list = await request(app).get(`/api/products?categoria=${cat.portateis._id}`);
  const [a, b] = list.body.products.map((p) => p._id);
  const res = await request(app).get(`/api/products/compare?ids=${a},${b}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.products.length, 2);
  assert.ok(res.body.attributeKeys.includes('RAM'));
  assert.ok(res.body.attributeKeys.includes('CPU'));
});

test('comparador recusa produtos de categorias diferentes', async () => {
  const portatil = (
    await request(app).get(`/api/products?categoria=${cat.portateis._id}`)
  ).body.products[0]._id;
  const monitor = (await request(app).get(`/api/products?categoria=${cat.monitores._id}`))
    .body.products[0]._id;
  const res = await request(app).get(`/api/products/compare?ids=${portatil},${monitor}`);
  assert.equal(res.status, 400);
});

test('criar produto exige autenticação de loja', async () => {
  const semAuth = await request(app)
    .post('/api/products')
    .field('ean', '999')
    .field('nome', 'X')
    .field('categoria', String(cat.monitores._id))
    .field('preco', '50');
  assert.equal(semAuth.status, 401);
});

test('loja cria um produto novo', async () => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${lojaToken}`)
    .field('ean', '555')
    .field('nome', 'Teclado Teste')
    .field('categoria', String(cat.monitores._id))
    .field('preco', '49.99')
    .field('stock', '10')
    .field('atributos', JSON.stringify({ Layout: 'PT' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.product.slug, 'teclado-teste-555');
});

test('filtros: marcas, marca, intervalo de preço e em-stock', async () => {
  const marcas = await request(app).get('/api/products/marcas');
  assert.ok(marcas.body.marcas.includes('HP'));
  assert.ok(marcas.body.marcas.includes('ASUS'));

  const hp = await request(app).get('/api/products?marca=HP');
  assert.equal(hp.body.pagination.total, 1);
  assert.equal(hp.body.products[0].ean, '222');

  // ASUS 600 + Lenovo 500 (HP 800 e Samsung 200 ficam de fora)
  const faixa = await request(app).get('/api/products?minPreco=400&maxPreco=700');
  assert.equal(faixa.body.pagination.total, 2);

  // produto esgotado fica de fora com emStock=true
  await Product.create({
    ean: '000',
    nome: 'ASUS Esgotado',
    marca: 'ASUS',
    categoria: cat.monitores._id,
    preco: 100,
    stock: 0,
  });
  const todos = await request(app).get('/api/products?marca=ASUS');
  const comStock = await request(app).get('/api/products?marca=ASUS&emStock=true');
  assert.ok(todos.body.pagination.total > comStock.body.pagination.total);
});

test('input malicioso na pesquisa/preço não rebenta (sem 500)', async () => {
  const qArray = await request(app).get('/api/products?q=a&q=b'); // q chega como array
  assert.equal(qArray.status, 200);
  const precoMau = await request(app).get('/api/products?minPreco=abc&maxPreco=xyz');
  assert.equal(precoMau.status, 200);
  const catMau = await request(app).get('/api/products?categoria=nao-e-um-id');
  assert.equal(catMau.status, 200);
});

test('criar produto com categoria inexistente devolve 400', async () => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${lojaToken}`)
    .field('ean', '777')
    .field('nome', 'Sem categoria')
    .field('categoria', '0123456789abcdef01234567')
    .field('preco', '20');
  assert.equal(res.status, 400);
});
