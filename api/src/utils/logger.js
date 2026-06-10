/**
 * Logger minimalista (sem dependências). Pode ser trocado por pino/winston
 * mais tarde sem alterar os call sites.
 */
const ts = () => new Date().toISOString();

export const logger = {
  info: (msg) => console.log(`[${ts()}] INFO  ${msg}`),
  warn: (msg) => console.warn(`[${ts()}] WARN  ${msg}`),
  error: (msg) => console.error(`[${ts()}] ERROR ${msg}`),
};
