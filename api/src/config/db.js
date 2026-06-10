/**
 * Ligação ao MongoDB via Mongoose.
 * A connection string vem de env.mongoUri (nunca hardcoded).
 */
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info('MongoDB ligado.'));
  mongoose.connection.on('error', (err) =>
    logger.error(`Erro de ligação ao MongoDB: ${err.message}`)
  );
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB desligado.'));

  await mongoose.connect(env.mongoUri);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
