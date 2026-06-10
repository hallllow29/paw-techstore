/**
 * Seed da base de dados.
 * Corre com:  npm run seed
 *
 * Popula a BD apontada por MONGODB_URI com dados de demonstração
 * (loja, categorias, produtos, utilizadores de exemplo, etc.).
 *
 * NOTA (Fase 0): os modelos ainda não existem. À medida que forem criados
 * na Fase 1+, importa-os aqui e preenche as funções de seed abaixo.
 * O objetivo é que o professor possa correr este comando uma vez e ver
 * a loja já com conteúdo — nunca uma loja vazia.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

async function seed() {
  await connectDB();
  logger.info('A iniciar seed...');

  // TODO (Fase 1+): limpar coleções e inserir dados de demonstração.
  //   await User.deleteMany({});
  //   await Category.deleteMany({});
  //   await Product.deleteMany({});
  //   ... criar admin, loja, estafetas, categorias, produtos ...

  logger.warn('Seed ainda vazio — modelos serão adicionados na Fase 1.');
  logger.info('Seed concluído.');
  await disconnectDB();
}

seed().catch((err) => {
  logger.error(`Seed falhou: ${err.message}`);
  process.exit(1);
});
