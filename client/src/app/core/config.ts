/** Origem da API (sem /api) — usada para imagens servidas em /uploads. */
export const API_ORIGIN = 'http://localhost:3000';

/** URL base da API. Em produção/Docker pode ser sobreposto por proxy. */
export const API_URL = `${API_ORIGIN}/api`;

export const TOKEN_KEY = 'paw_token';

/** Resolve o caminho de uma imagem do servidor para URL absoluto. */
export function imageUrl(path?: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}
