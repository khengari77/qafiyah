import { flattenVerses } from './flatten-verse-description';

describe('flattenVerses', () => {
  it('returns empty string for empty array', () => {
    expect(flattenVerses([])).toBe('');
  });

  it('returns empty string for null/undefined input', () => {
    expect(flattenVerses(null as unknown as [string, string][])).toBe('');
  });

  it('formats a single verse with separator between halves', () => {
    expect(flattenVerses([['الشطر الأول', 'الشطر الثاني']])).toBe('الشطر الأول * الشطر الثاني');
  });

  it('joins multiple verses with " * " separator', () => {
    const result = flattenVerses([
      ['أول', 'ثانٍ'],
      ['ثالث', 'رابع'],
    ]);
    expect(result).toBe('أول * ثانٍ * ثالث * رابع');
  });

  it('stops adding verses once the 300-char limit would be exceeded', () => {
    const longHalf = 'ب'.repeat(150);
    const verses: [string, string][] = [
      [longHalf, longHalf],
      ['هذا لن يظهر', 'ولا هذا'],
    ];
    const result = flattenVerses(verses);
    expect(result.length).toBeLessThanOrEqual(300);
    expect(result).not.toContain('هذا لن يظهر');
  });

  it('truncates at exactly 300 chars when result is too long', () => {
    const hugePair = 'أ'.repeat(400);
    const result = flattenVerses([[hugePair, '']]);
    expect(result.length).toBeLessThanOrEqual(300);
  });

  it('handles verses with empty second half', () => {
    const result = flattenVerses([['شطر', '']]);
    expect(result).toContain('شطر');
  });
});
