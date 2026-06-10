import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';

const app = createApp();
let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const cliente = {
  nome: 'Ana Cliente',
  email: 'ana@example.com',
  password: 'segredo123',
  morada: 'Rua A, 1',
  telefone: '910000000',
};

test('registo de cliente devolve 201 + token', async () => {
  const res = await request(app).post('/api/auth/register').send(cliente);
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'cliente');
  assert.equal(res.body.user.status, 'ativo');
  assert.equal(res.body.user.password, undefined); // nunca devolver password
});

test('registo com email duplicado devolve 409', async () => {
  const res = await request(app).post('/api/auth/register').send(cliente);
  assert.equal(res.status, 409);
});

test('registo com dados inválidos devolve 422', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'x' });
  assert.equal(res.status, 422);
});

test('estafeta regista-se com estado pendente', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email: 'rui@example.com', role: 'estafeta' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'estafeta');
  assert.equal(res.body.user.status, 'pendente');
});

test('login correto devolve token; password errada devolve 401', async () => {
  const ok = await request(app)
    .post('/api/auth/login')
    .send({ email: cliente.email, password: cliente.password });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);

  const bad = await request(app)
    .post('/api/auth/login')
    .send({ email: cliente.email, password: 'errada' });
  assert.equal(bad.status, 401);
});

test('GET /api/auth/me exige token', async () => {
  const semToken = await request(app).get('/api/auth/me');
  assert.equal(semToken.status, 401);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: cliente.email, password: cliente.password });
  const comToken = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(comToken.status, 200);
  assert.equal(comToken.body.user.email, cliente.email);
});

test('admin aprova um estafeta pendente', async () => {
  // cria admin diretamente e autentica
  await User.create({
    nome: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    morada: 'Loja',
    telefone: '910999999',
    role: 'admin',
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  const token = login.body.token;

  const pendentes = await request(app)
    .get('/api/users/estafetas/pendentes')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(pendentes.status, 200);
  assert.ok(pendentes.body.count >= 1);

  const estafetaId = pendentes.body.users[0]._id;
  const aprovar = await request(app)
    .patch(`/api/users/${estafetaId}/aprovar`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(aprovar.status, 200);
  assert.equal(aprovar.body.user.status, 'ativo');
});

test('rota de admin recusa um cliente (403)', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: cliente.email, password: cliente.password });
  const res = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(res.status, 403);
});
