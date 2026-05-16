import { describe, expect, it } from 'vitest';
import { extractPoemExcerpt, type PoemId, type RandomPoemLines } from './extract-poem-excerpt';

// test-only: brand a literal number as a PoemId for fixture construction.
const asPoemId = (n: number): PoemId => n as PoemId;

const poem = (content: string): RandomPoemLines => ({
  poem_id: asPoemId(1),
  poet_name: 'شاعر',
  content,
});

describe('extractPoemExcerpt', () => {
  it('returns the two lines at startIndex plus the poet name', () => {
    const result = extractPoemExcerpt(poem('شطر أول*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('throws when poem has fewer than two lines', () => {
    expect(() => extractPoemExcerpt(poem('شطر واحد'), 0)).toThrow(
      'Poem has insufficient content for formatting'
    );
  });

  it('strips double quotes from output', () => {
    const result = extractPoemExcerpt(poem('"شطر أول"*"شطر ثانٍ"'), 0);
    expect(result).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('includes the poet name in the output', () => {
    const p: RandomPoemLines = { poem_id: asPoemId(2), poet_name: 'المتنبي', content: 'أ*ب' };
    expect(extractPoemExcerpt(p, 0)).toContain('المتنبي');
  });

  it('uses empty string fallback when lines[startIndex] is empty', () => {
    const result = extractPoemExcerpt(poem('*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result).toContain('شاعر');
  });

  it('uses empty string fallback when lines[startIndex + 1] is empty', () => {
    const result = extractPoemExcerpt(poem('شطر أول**شطر ثالث*شطر رابع'), 0);
    expect(result).toContain('شاعر');
  });

  it('returns a valid pair for any even startIndex in range', () => {
    const lines = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
    const content = lines.join('*');
    for (let startIndex = 0; startIndex < lines.length - 1; startIndex += 2) {
      const result = extractPoemExcerpt(poem(content), startIndex);
      expect(result).toBeTruthy();
      expect(result.split('\n').length).toBeGreaterThanOrEqual(2);
    }
  });
});
