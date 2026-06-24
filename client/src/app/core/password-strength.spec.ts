import { PASSWORD_PATTERN, forcaPassword } from './password-strength';

describe('password-strength', () => {
  it('PASSWORD_PATTERN exige 8+ caracteres com letra e número', () => {
    expect(PASSWORD_PATTERN.test('abc123')).toBe(false); // < 8
    expect(PASSWORD_PATTERN.test('abcdefgh')).toBe(false); // sem número
    expect(PASSWORD_PATTERN.test('12345678')).toBe(false); // sem letra
    expect(PASSWORD_PATTERN.test('abcd1234')).toBe(true);
  });

  it('password vazia tem score 0, sem etiqueta', () => {
    const f = forcaPassword('');
    expect(f.score).toBe(0);
    expect(f.label).toBe('');
    expect(f.pct).toBe(0);
  });

  it('classifica fraca vs muito forte', () => {
    expect(forcaPassword('abc').score).toBeLessThanOrEqual(1);

    const forte = forcaPassword('Sircarios2026!');
    expect(forte.score).toBe(4);
    expect(forte.cor).toBe('success');
    expect(forte.pct).toBe(100);
  });
});
