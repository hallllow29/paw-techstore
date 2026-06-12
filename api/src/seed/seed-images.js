/**
 * Atribui/atualiza as imagens dos produtos (sem recriar nada).
 * Corre com:  npm run seed:images
 *
 * Usa fotos reais de api/seed-assets/<EAN>.<ext> quando existem;
 * caso contrário gera placeholders on-brand. Ver assignProductImages().
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { assignProductImages } from './product-images.js';

try {
  await connectDB();
  await assignProductImages();
  await disconnectDB();
} catch (err) {
  logger.error(`seed:images falhou: ${err.message}`);
  process.exit(1);
}
