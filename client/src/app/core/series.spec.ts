import { serieDiaria, Bucket } from './series';

function isoHoje(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

describe('serieDiaria', () => {
  it('produz N pontos contíguos, preenchendo a zero os dias sem dados', () => {
    const s = serieDiaria([], 14, 'total');
    expect(s.length).toBe(14);
    expect(s.every((p) => p.value === 0)).toBe(true);
  });

  it('coloca o valor de hoje no último ponto', () => {
    const buckets: Bucket[] = [{ _id: isoHoje(), total: 42, contagem: 3 }];

    const porTotal = serieDiaria(buckets, 7, 'total');
    expect(porTotal.length).toBe(7);
    expect(porTotal.at(-1)?.value).toBe(42);

    const porContagem = serieDiaria(buckets, 7, 'contagem');
    expect(porContagem.at(-1)?.value).toBe(3);
  });
});
