import { normalizeRhymePattern } from './normalize-rhyme-pattern';

describe('normalizeRhymePattern', () => {
  it('strips surrounding parentheses', () => {
    expect(normalizeRhymePattern('(قافية)')).toBe('قافية');
  });

  it('removes leading ال (al-)', () => {
    expect(normalizeRhymePattern('الميم')).toBe('ميم');
  });

  it('strips parens and then removes leading ال', () => {
    expect(normalizeRhymePattern('(الراء)')).toBe('راء');
  });

  it('leaves already-clean pattern unchanged', () => {
    expect(normalizeRhymePattern('ميم')).toBe('ميم');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRhymePattern('  قافية  ')).toBe('قافية');
  });

  it('handles empty string', () => {
    expect(normalizeRhymePattern('')).toBe('');
  });

  it('does not remove ال in the middle of a word', () => {
    expect(normalizeRhymePattern('بالميم')).toBe('بالميم');
  });
});
