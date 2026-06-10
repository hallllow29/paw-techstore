import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Nota: createApp() não liga à BD nem abre porta — perfeito para testes.
const app = createApp();

test('GET /api/health responde 200 e status ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 'ok');
});

test('rota inexistente responde 404', async () => {
  const res = await request(app).get('/api/nao-existe');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
