/**
 * Seed da base de dados.
 * Corre com:  npm run seed
 *
 * Popula a BD apontada por MONGODB_URI com utilizadores de demonstração.
 * Idempotente: limpa os utilizadores e recria-os.
 *
 * Credenciais de demonstração (password igual para todos): demo1234
 *   admin@paw.pt    → administrador
 *   loja@paw.pt     → loja
 *   estafeta1@paw.pt→ estafeta (aprovado)
 *   estafeta2@paw.pt→ estafeta (pendente)
 *   ana@paw.pt      → cliente
 *   rui@paw.pt      → cliente
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/user.model.js';

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
  logger.info('A iniciar seed...');

  await User.deleteMany({});
  // Criar um a um para acionar o pre-save (hash da password)
  for (const u of users) {
    await User.create({
      ...u,
      password: PWD,
      morada: 'Rua de Exemplo, 123, Porto',
      telefone: '910000000',
    });
  }

  logger.info(`Seed concluído: ${users.length} utilizadores (password: ${PWD}).`);
  await disconnectDB();
} catch (err) {
  logger.error(`Seed falhou: ${err.message}`);
  process.exit(1);
}
