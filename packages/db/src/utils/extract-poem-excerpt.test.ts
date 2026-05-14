import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractPoemExcerpt, type RandomPoemLines } from './extract-poem-excerpt';

const poem = (content: string): RandomPoemLines => ({
  poem_id: 1,
  poet_name: 'شاعر',
  content,
});

describe('extractPoemExcerpt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns first two lines plus poet name when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = extractPoemExcerpt(poem('شطر أول*شطر ثانٍ*شطر ثالث*شطر رابع'));
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('throws when poem has fewer than two lines', () => {
    expect(() => extractPoemExcerpt(poem('شطر واحد'))).toThrow(
      'Poem has insufficient content for formatting'
    );
  });

  it('strips double quotes from output', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = extractPoemExcerpt(poem('"شطر أول"*"شطر ثانٍ"'));
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('includes the poet name in the output', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const p: RandomPoemLines = { poem_id: 2, poet_name: 'المتنبي', content: 'أ*ب' };
    expect(extractPoemExcerpt(p)).toContain('المتنبي');
  });

  it('always selects a valid pair of consecutive lines', () => {
    const lines = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const content = lines.join('*');
    for (let r = 0; r < 10; r++) {
      vi.spyOn(Math, 'random').mockReturnValue(r / 10);
      const result = extractPoemExcerpt(poem(content));
      expect(result).toBeTruthy();
      expect(result.split('\n').length).toBeGreaterThanOrEqual(2);
      vi.restoreAllMocks();
    }
  });
});
