/** Utilitários para transformar baldes diários do backend em séries completas. */

export interface Bucket {
  _id: string; // 'YYYY-MM-DD'
  total: number;
  contagem: number;
}

export interface Ponto {
  label: string;
  value: number;
}

/**
 * Constrói uma série contígua dos últimos `dias` (incluindo hoje), preenchendo
 * com zero os dias sem dados. `campo` escolhe entre soma (total) ou contagem.
 */
export function serieDiaria(
  buckets: Bucket[],
  dias = 14,
  campo: 'total' | 'contagem' = 'total',
): Ponto[] {
  const mapa = new Map(buckets.map((b) => [b._id, b]));
  const out: Ponto[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (dias - 1));
  for (let i = 0; i < dias; i++) {
    const iso = isoDia(d);
    const b = mapa.get(iso);
    out.push({ label: iso.slice(5), value: b ? b[campo] : 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Data local no formato YYYY-MM-DD (sem deslocamento de fuso). */
function isoDia(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
