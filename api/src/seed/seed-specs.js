/**
 * Aplica/atualiza as especificações técnicas dos produtos (sem recriar nada).
 * Corre com:  npm run seed:specs
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { assignProductSpecs } from './product-specs.js';

try {
  await connectDB();
  await assignProductSpecs();
  await disconnectDB();
} catch (err) {
  logger.error(`seed:specs falhou: ${err.message}`);
  process.exit(1);
}
