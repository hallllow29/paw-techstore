/**
 * Origem da API (sem /api), também usada para /uploads e Socket.IO.
 * - Dev (ng serve em :4200): aponta direto para a API em :3000.
 * - Produção (servido pelo nginx noutra porta): usa a MESMA origem da página
 *   - o nginx faz proxy de /api, /uploads e /socket.io para a API. Assim não
 *   há hosts hardcoded e o CSP pode ficar em 'self'.
 */
const ehDevServe = globalThis.location?.port === '4200';
export const API_ORIGIN = ehDevServe
  ? 'http://localhost:3000'
  : (globalThis.location?.origin ?? '');

/** URL base da API. */
export const API_URL = `${API_ORIGIN}/api`;

export const TOKEN_KEY = 'paw_token';

/**
 * Token de sessão guardado em localStorage + cookie (SameSite=Lax).
 * O cookie sobrevive a redirects de topo (ex.: regresso do PayPal), em que o
 * localStorage por vezes não persiste; ao ler, reidratamos o localStorage.
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* armazenamento indisponível */
  }
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`;
}

export function readToken(): string | null {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  if (token) return token;
  const m = new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]+)`).exec(document.cookie);
  const fromCookie = m ? decodeURIComponent(m[1]) : null;
  if (fromCookie) {
    try {
      localStorage.setItem(TOKEN_KEY, fromCookie); // reidrata
    } catch {
      /* ignore */
    }
  }
  return fromCookie;
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

/** Resolve o caminho de uma imagem do servidor para URL absoluto. */
export function imageUrl(path?: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}
