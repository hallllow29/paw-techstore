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

test('registo de cliente devolve 201 (sem login — exige confirmar email)', async () => {
  const res = await request(app).post('/api/auth/register').send(cliente);
  assert.equal(res.status, 201);
  assert.equal(res.body.token, undefined); // sem auto-login
  assert.equal(res.body.user.role, 'cliente');
  assert.equal(res.body.user.status, 'ativo');
  assert.equal(res.body.user.emailVerificado, false);
  assert.equal(res.body.user.password, undefined); // nunca devolver password
  assert.ok(res.body.devEmailToken);
  // Confirma o email para que os testes de login seguintes funcionem
  const conf = await request(app)
    .post('/api/auth/email/verify')
    .send({ token: res.body.devEmailToken });
  assert.equal(conf.status, 200);
  assert.equal(conf.body.user.emailVerificado, true);
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
    emailVerificado: true,
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

test('OTP: cliente pede código e recebe-o (devCode em ambiente de teste)', async () => {
  const res = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: cliente.email });
  assert.equal(res.status, 200);
  assert.match(String(res.body.devCode), /^\d{6}$/);
});

test('OTP: código errado falha (401) e código certo autentica', async () => {
  const pedir = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: cliente.email });
  const code = pedir.body.devCode;

  const errado = await request(app)
    .post('/api/auth/otp/verify')
    .send({ email: cliente.email, code: '000000' });
  assert.equal(errado.status, 401);

  const certo = await request(app)
    .post('/api/auth/otp/verify')
    .send({ email: cliente.email, code });
  assert.equal(certo.status, 200);
  assert.ok(certo.body.token);
  assert.equal(certo.body.user.otpHash, undefined); // nunca devolver o hash do OTP
});

test('OTP: o mesmo código não pode ser reutilizado', async () => {
  const pedir = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: cliente.email });
  const code = pedir.body.devCode;
  const um = await request(app)
    .post('/api/auth/otp/verify')
    .send({ email: cliente.email, code });
  assert.equal(um.status, 200);
  const dois = await request(app)
    .post('/api/auth/otp/verify')
    .send({ email: cliente.email, code });
  assert.equal(dois.status, 401);
});

test('OTP: canal inválido devolve 422', async () => {
  const res = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: cliente.email, canal: 'pombo-correio' });
  assert.equal(res.status, 422);
});

test('OTP: email sem conta de cliente devolve resposta genérica (sem código)', async () => {
  const res = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: 'naoexiste@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.devCode, undefined);
});

test('OTP: estafeta não usa OTP (mantém password)', async () => {
  const res = await request(app)
    .post('/api/auth/otp/request')
    .send({ email: 'rui@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.devCode, undefined);
});

test('cliente atualiza o próprio perfil', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: cliente.email, password: cliente.password });
  const res = await request(app)
    .patch('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({ nome: 'Ana Atualizada', telefone: '911111111' });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.nome, 'Ana Atualizada');
  assert.equal(res.body.user.telefone, '911111111');
});

test('recuperar password: forgot envia código e reset define nova password', async () => {
  const email = 'reset@example.com';
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email, password: 'velha123' });
  // Confirma o email (o login final exige conta validada)
  await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reg.body.devEmailToken });

  const forgot = await request(app).post('/api/auth/password/forgot').send({ email });
  assert.equal(forgot.status, 200);
  assert.match(String(forgot.body.devCode), /^\d{6}$/);

  const errado = await request(app)
    .post('/api/auth/password/reset')
    .send({ email, code: '000000', newPassword: 'nova12345' });
  assert.equal(errado.status, 401);

  const reset = await request(app)
    .post('/api/auth/password/reset')
    .send({ email, code: forgot.body.devCode, newPassword: 'nova12345' });
  assert.equal(reset.status, 200);
  assert.ok(reset.body.token);

  const ok = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'nova12345' });
  assert.equal(ok.status, 200);

  const bad = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'velha123' });
  assert.equal(bad.status, 401);
});

test('confirmação de email: registo gera token, confirma e não reutiliza', async () => {
  const email = 'confirma@example.com';
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.emailVerificado, false);
  assert.ok(reg.body.devEmailToken);

  // token inválido → 400
  const mau = await request(app)
    .post('/api/auth/email/verify')
    .send({ token: 'a'.repeat(64) });
  assert.equal(mau.status, 400);

  // token correto → 200 e email confirmado (hash nunca sai na resposta)
  const ok = await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reg.body.devEmailToken });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.emailVerificado, true);
  assert.equal(ok.body.user.emailTokenHash, undefined);

  // reutilizar o mesmo token → 400 (não pode ser usado duas vezes)
  const repetir = await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reg.body.devEmailToken });
  assert.equal(repetir.status, 400);
});

test('confirmação de email: reenvio público gera novo token válido', async () => {
  const email = 'reenvio@example.com';
  await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email });

  const reenviar = await request(app).post('/api/auth/email/resend').send({ email });
  assert.equal(reenviar.status, 200);
  assert.ok(reenviar.body.devEmailToken);

  const confirma = await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reenviar.body.devEmailToken });
  assert.equal(confirma.status, 200);
  assert.equal(confirma.body.user.emailVerificado, true);

  // já confirmado: reenviar responde 200 genérico sem novo token
  const jaConfirmado = await request(app).post('/api/auth/email/resend').send({ email });
  assert.equal(jaConfirmado.status, 200);
  assert.equal(jaConfirmado.body.devEmailToken, undefined);
});

test('email/resend para email inexistente devolve 200 genérico (sem token)', async () => {
  const res = await request(app)
    .post('/api/auth/email/resend')
    .send({ email: 'naoexiste@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.devEmailToken, undefined);
});

test('login bloqueado enquanto o email não estiver confirmado', async () => {
  const email = 'gate@example.com';
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email });

  const bloqueado = await request(app)
    .post('/api/auth/login')
    .send({ email, password: cliente.password });
  assert.equal(bloqueado.status, 403);
  assert.equal(bloqueado.body.naoConfirmado, true);

  // Depois de confirmar, já entra
  await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reg.body.devEmailToken });
  const ok = await request(app)
    .post('/api/auth/login')
    .send({ email, password: cliente.password });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test('OTP por SMS identifica a conta pelo telemóvel', async () => {
  // cria um cliente confirmado com telemóvel único
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ ...cliente, email: 'sms@example.com', telefone: '912345678' });
  await request(app)
    .post('/api/auth/email/verify')
    .send({ token: reg.body.devEmailToken });

  const pedir = await request(app)
    .post('/api/auth/otp/request')
    .send({ telefone: '912345678', canal: 'sms' });
  assert.equal(pedir.status, 200);
  assert.match(String(pedir.body.devCode), /^\d{6}$/);

  const certo = await request(app)
    .post('/api/auth/otp/verify')
    .send({ telefone: '912345678', code: pedir.body.devCode });
  assert.equal(certo.status, 200);
  assert.ok(certo.body.token);
});
