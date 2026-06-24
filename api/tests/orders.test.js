import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Category } from '../src/models/category.model.js';
import { Product } from '../src/models/product.model.js';
import { Order } from '../src/models/order.model.js';
import { Coupon } from '../src/models/coupon.model.js';

const app = createApp();
let mongo;
const tokens = {};
let produto;

async function novoUser(role) {
  const email = `${role}@t.pt`;
  await User.create({
    nome: role,
    email,
    password: 'pass1234',
    morada: 'Rua 1',
    telefone: `9${role}`,
    role,
    emailVerificado: true,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'pass1234' });
  return res.body.token;
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const cat = await Category.create({ nome: 'Portáteis' });
  produto = await Product.create({
    ean: '1',
    nome: 'Portátil',
    categoria: cat._id,
    preco: 100,
    stock: 1000,
  });

  tokens.cliente = await novoUser('cliente');
  tokens.loja = await novoUser('loja');
  tokens.estafeta = await novoUser('estafeta');
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

test('cliente cria encomenda e o stock é descontado', async () => {
  const antes = (await Product.findById(produto._id)).stock;
  const res = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'estafeta',
      itens: [{ produto: produto._id, quantidade: 2 }],
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.order.subtotal, 200);
  assert.equal(res.body.order.custoEntrega, 4.99); // default do seed de settings
  assert.equal(res.body.order.total, 204.99);

  assert.equal((await Product.findById(produto._id)).stock, antes - 2);
});

test('encomenda sem stock suficiente é recusada (409)', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 100000 }],
    });
  assert.equal(res.status, 409);
});

test('fluxo loja→estafeta: confirmar, preparar, aceitar e entregar', async () => {
  const order = await Order.findOne({ metodoEntrega: 'estafeta' });

  const conf = await request(app)
    .patch(`/api/orders/${order._id}/estado`)
    .set(auth(tokens.loja))
    .send({ estado: 'confirmada' });
  assert.equal(conf.body.order.estado, 'confirmada');
  assert.ok(conf.body.order.confirmadaEm);

  await request(app)
    .patch(`/api/orders/${order._id}/estado`)
    .set(auth(tokens.loja))
    .send({ estado: 'em_preparacao' });

  const disp = await request(app)
    .get('/api/orders/entregas/disponiveis')
    .set(auth(tokens.estafeta));
  assert.ok(disp.body.orders.length >= 1);

  const aceitar = await request(app)
    .patch(`/api/orders/${order._id}/aceitar`)
    .set(auth(tokens.estafeta));
  assert.equal(aceitar.body.order.estado, 'em_entrega');

  const entregar = await request(app)
    .patch(`/api/orders/${order._id}/entregue`)
    .set(auth(tokens.estafeta));
  assert.equal(entregar.body.order.estado, 'entregue');
});

test('estafeta só pode ter uma entrega em curso', async () => {
  // Cria 2 encomendas estafeta e prepara-as
  const mk = async () => {
    const r = await request(app)
      .post('/api/orders')
      .set(auth(tokens.cliente))
      .send({
        metodoEntrega: 'estafeta',
        itens: [{ produto: produto._id, quantidade: 1 }],
      });
    const id = r.body.order._id;
    await request(app)
      .patch(`/api/orders/${id}/estado`)
      .set(auth(tokens.loja))
      .send({ estado: 'confirmada' });
    await request(app)
      .patch(`/api/orders/${id}/estado`)
      .set(auth(tokens.loja))
      .send({ estado: 'em_preparacao' });
    return id;
  };
  const a = await mk();
  const b = await mk();

  const aceitarA = await request(app)
    .patch(`/api/orders/${a}/aceitar`)
    .set(auth(tokens.estafeta));
  assert.equal(aceitarA.status, 200);

  const aceitarB = await request(app)
    .patch(`/api/orders/${b}/aceitar`)
    .set(auth(tokens.estafeta));
  assert.equal(aceitarB.status, 409); // já tem uma em curso
});

test('cancelar fora da janela de 10 min é recusado', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const id = r.body.order._id;
  await request(app)
    .patch(`/api/orders/${id}/estado`)
    .set(auth(tokens.loja))
    .send({ estado: 'confirmada' });

  // Forçar confirmadaEm para há 20 minutos
  await Order.updateOne(
    { _id: id },
    { confirmadaEm: new Date(Date.now() - 20 * 60 * 1000) }
  );

  const cancel = await request(app)
    .patch(`/api/orders/${id}/cancelar`)
    .set(auth(tokens.cliente));
  assert.equal(cancel.status, 403);
});

test('cancelar encomenda pendente repõe o stock', async () => {
  const antes = (await Product.findById(produto._id)).stock;
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  assert.equal((await Product.findById(produto._id)).stock, antes - 1);

  const cancel = await request(app)
    .patch(`/api/orders/${r.body.order._id}/cancelar`)
    .set(auth(tokens.cliente));
  assert.equal(cancel.status, 200);
  assert.equal((await Product.findById(produto._id)).stock, antes); // reposto
});

test('dashboard da loja devolve número de encomendas', async () => {
  const res = await request(app).get('/api/dashboard').set(auth(tokens.loja));
  assert.equal(res.status, 200);
  assert.equal(res.body.role, 'loja');
  assert.ok(res.body.data.numEncomendas >= 1);
});

test('loja cria cupão e cliente aplica-o no checkout', async () => {
  const criar = await request(app)
    .post('/api/coupons')
    .set(auth(tokens.loja))
    .send({ codigo: 'paw10', tipo: 'percentagem', valor: 10 });
  assert.equal(criar.status, 201);
  assert.equal(criar.body.coupon.codigo, 'PAW10'); // uppercase automático

  const validar = await request(app)
    .post('/api/coupons/validate')
    .set(auth(tokens.cliente))
    .send({ codigo: 'PAW10', subtotal: 100 });
  assert.equal(validar.status, 200);
  assert.equal(validar.body.desconto, 10);

  // produto custa 100; qtd 1; levantamento em loja (custo 0)
  const order = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
      cupao: 'PAW10',
    });
  assert.equal(order.status, 201);
  assert.equal(order.body.order.desconto, 10);
  assert.equal(order.body.order.total, 90); // 100 - 10 + 0
});

test('cancelar uma encomenda repõe o uso do cupão', async () => {
  await request(app)
    .post('/api/coupons')
    .set(auth(tokens.loja))
    .send({ codigo: 'CANCELA5', tipo: 'valor', valor: 5 });
  const ord = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
      cupao: 'CANCELA5',
    });
  assert.equal((await Coupon.findOne({ codigo: 'CANCELA5' })).usos, 1);

  await request(app)
    .patch(`/api/orders/${ord.body.order._id}/cancelar`)
    .set(auth(tokens.cliente));
  assert.equal((await Coupon.findOne({ codigo: 'CANCELA5' })).usos, 0);
});

test('cliente avalia uma encomenda entregue (e não duplica)', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const id = r.body.order._id;
  for (const estado of ['confirmada', 'em_preparacao', 'em_entrega', 'entregue']) {
    await request(app)
      .patch(`/api/orders/${id}/estado`)
      .set(auth(tokens.loja))
      .send({ estado });
  }

  const av = await request(app)
    .post('/api/reviews')
    .set(auth(tokens.cliente))
    .send({ orderId: id, ratingEncomenda: 5, comentario: 'Excelente' });
  assert.equal(av.status, 201);
  assert.equal(av.body.review.ratingEncomenda, 5);

  const dup = await request(app)
    .post('/api/reviews')
    .set(auth(tokens.cliente))
    .send({ orderId: id, ratingEncomenda: 3 });
  assert.equal(dup.status, 409);
});

test('estafeta pendente não pode operar entregas', async () => {
  await User.create({
    nome: 'Pendente',
    email: 'pend@t.pt',
    password: 'pass1234',
    morada: 'x',
    telefone: '9pend',
    role: 'estafeta',
    status: 'pendente',
    emailVerificado: true,
  });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'pend@t.pt', password: 'pass1234' });
  const res = await request(app)
    .get('/api/orders/entregas/disponiveis')
    .set(auth(login.body.token));
  assert.equal(res.status, 403);
});

test('encomenda com morada escolhida e Multibanco gera referência e confirma', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      metodoPagamento: 'multibanco',
      morada: 'Rua Nova 99, Lisboa',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  assert.equal(r.status, 201);
  assert.equal(r.body.order.morada, 'Rua Nova 99, Lisboa');
  assert.ok(r.body.order.multibanco.entidade);
  assert.ok(r.body.order.multibanco.referencia);
  assert.equal(r.body.order.pago, false);

  const conf = await request(app)
    .post(`/api/payments/multibanco/${r.body.order._id}/confirmar`)
    .set(auth(tokens.cliente));
  assert.equal(conf.status, 200);
  assert.equal(conf.body.pago, true);
});

test('pagamento MB WAY marca a encomenda como paga', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      metodoPagamento: 'mbway',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const pay = await request(app)
    .post(`/api/payments/mbway/${r.body.order._id}`)
    .set(auth(tokens.cliente));
  assert.equal(pay.status, 200);
  assert.equal(pay.body.pago, true);
});

test('pagamento PayPal simulado marca a encomenda como paga', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      metodoPagamento: 'paypal',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  assert.equal(r.body.order.metodoPagamento, 'paypal');

  const pay = await request(app)
    .post(`/api/payments/paypal/${r.body.order._id}`)
    .set(auth(tokens.cliente));
  assert.equal(pay.status, 200);
  assert.equal(pay.body.pago, true);
});

test('cliente avalia um produto que comprou (média atualiza, não duplica)', async () => {
  const r = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const id = r.body.order._id;
  for (const estado of ['confirmada', 'em_preparacao', 'em_entrega', 'entregue']) {
    await request(app)
      .patch(`/api/orders/${id}/estado`)
      .set(auth(tokens.loja))
      .send({ estado });
  }

  const av = await request(app)
    .post(`/api/products/${produto._id}/reviews`)
    .set(auth(tokens.cliente))
    .send({ rating: 5, comentario: 'Excelente produto' });
  assert.equal(av.status, 201);
  assert.equal(av.body.ratingMedia, 5);
  assert.ok(av.body.numAvaliacoes >= 1);

  const dup = await request(app)
    .post(`/api/products/${produto._id}/reviews`)
    .set(auth(tokens.cliente))
    .send({ rating: 3 });
  assert.equal(dup.status, 409);
});

test('quem não comprou não pode avaliar o produto (403)', async () => {
  const cat = await Category.findOne();
  const p2 = await Product.create({
    ean: 'SEM-COMPRAS-1',
    nome: 'Produto sem compras',
    categoria: cat._id,
    preco: 10,
    stock: 5,
  });
  const av = await request(app)
    .post(`/api/products/${p2._id}/reviews`)
    .set(auth(tokens.cliente))
    .send({ rating: 4 });
  assert.equal(av.status, 403);
});

test('notificações: nova encomenda notifica o cliente e marca-se como lida', async () => {
  await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'levantamento_loja',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });

  const res = await request(app).get('/api/notifications').set(auth(tokens.cliente));
  assert.equal(res.status, 200);
  assert.ok(res.body.naoLidas >= 1);
  assert.ok(res.body.notifications.length >= 1);

  const id = res.body.notifications[0]._id;
  const mark = await request(app)
    .patch(`/api/notifications/${id}/lida`)
    .set(auth(tokens.cliente));
  assert.equal(mark.status, 200);
});

test('estafeta liga/desliga a disponibilidade', async () => {
  const off = await request(app)
    .patch('/api/orders/entregas/disponibilidade')
    .set(auth(tokens.estafeta))
    .send({ disponivel: false });
  assert.equal(off.status, 200);
  assert.equal(off.body.disponivel, false);

  const on = await request(app)
    .patch('/api/orders/entregas/disponibilidade')
    .set(auth(tokens.estafeta))
    .send({ disponivel: true });
  assert.equal(on.body.disponivel, true);
});

test('loja atribui a entrega a um estafeta disponível', async () => {
  // estafeta dedicado e livre (o tokens.estafeta pode estar ocupado de testes anteriores)
  await User.create({
    nome: 'EstafetaLivre',
    email: 'livre@t.pt',
    password: 'pass1234',
    morada: 'x',
    telefone: '9livre',
    role: 'estafeta',
    emailVerificado: true,
  });

  const criar = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'estafeta',
      metodoPagamento: 'entrega',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const id = criar.body.order._id;

  // loja confirma a encomenda (pendente -> confirmada)
  await request(app)
    .patch(`/api/orders/${id}/estado`)
    .set(auth(tokens.loja))
    .send({ estado: 'confirmada' });

  // loja vê os estafetas e escolhe um disponível
  const couriers = await request(app)
    .get('/api/orders/entregas/estafetas')
    .set(auth(tokens.loja));
  assert.equal(couriers.status, 200);
  const estafeta = couriers.body.estafetas.find((e) => e.disponivel);
  assert.ok(estafeta);

  const atribuir = await request(app)
    .patch(`/api/orders/${id}/atribuir`)
    .set(auth(tokens.loja))
    .send({ estafetaId: estafeta._id });
  assert.equal(atribuir.status, 200);
  assert.equal(atribuir.body.order.estado, 'em_entrega');
  assert.equal(String(atribuir.body.order.estafeta), String(estafeta._id));
});

test('analytics da loja devolve KPIs (loja); recusa cliente (403)', async () => {
  const ok = await request(app).get('/api/analytics/loja').set(auth(tokens.loja));
  assert.equal(ok.status, 200);
  assert.ok(ok.body.kpis);
  assert.ok('receita' in ok.body.kpis);

  const neg = await request(app).get('/api/analytics/loja').set(auth(tokens.cliente));
  assert.equal(neg.status, 403);
});

test('loja nao pode atribuir a um estafeta ocupado (409)', async () => {
  const criar = await request(app)
    .post('/api/orders')
    .set(auth(tokens.cliente))
    .send({
      metodoEntrega: 'estafeta',
      metodoPagamento: 'entrega',
      itens: [{ produto: produto._id, quantidade: 1 }],
    });
  const id = criar.body.order._id;
  await request(app)
    .patch(`/api/orders/${id}/estado`)
    .set(auth(tokens.loja))
    .send({ estado: 'confirmada' });

  const couriers = await request(app)
    .get('/api/orders/entregas/estafetas')
    .set(auth(tokens.loja));
  const ocupado = couriers.body.estafetas.find((e) => e.ocupado);
  assert.ok(ocupado);

  const r = await request(app)
    .patch(`/api/orders/${id}/atribuir`)
    .set(auth(tokens.loja))
    .send({ estafetaId: ocupado._id });
  assert.equal(r.status, 409);
});
