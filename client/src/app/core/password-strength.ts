/**
 * Política de password e cálculo da força (partilhado pelos formulários).
 * Requisito mínimo: 8 caracteres, com pelo menos uma letra e um número.
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export interface ForcaPassword {
  score: number; // 0..4
  label: string;
  cor: string; // contexto Bootstrap: danger | warning | info | success
  pct: number; // 0..100 (largura da barra)
}

function nivel(score: number): { label: string; cor: string } {
  if (score <= 1) return { label: score === 0 ? 'Muito fraca' : 'Fraca', cor: 'danger' };
  if (score === 2) return { label: 'Razoável', cor: 'warning' };
  if (score === 3) return { label: 'Forte', cor: 'info' };
  return { label: 'Muito forte', cor: 'success' };
}

/** Avalia a força de uma password (comprimento + variedade de caracteres). */
export function forcaPassword(pw: string): ForcaPassword {
  if (!pw) return { score: 0, label: '', cor: 'secondary', pct: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12 && score >= 3) score = 4;
  score = Math.min(score, 4);
  const n = nivel(score);
  return { score, label: n.label, cor: n.cor, pct: Math.max(10, score * 25) };
}
