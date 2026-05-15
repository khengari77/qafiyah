import { describe, expect, it } from 'vitest';
import { processPoemContent } from './process-poem-content';

describe('processPoemContent', () => {
  it('splits an even number of lines into verse pairs', () => {
    const { verses } = processPoemContent('أ*ب*ج*د');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', 'د'],
    ]);
  });

  it('handles an odd number of lines (last verse gets empty second half)', () => {
    const { verses } = processPoemContent('أ*ب*ج');
    expect(verses).toEqual([
      ['أ', 'ب'],
      ['ج', ''],
    ]);
  });

  it('reports correct verseCount', () => {
    const { verseCount } = processPoemContent('أ*ب*ج*د');
    expect(verseCount).toBe(2);
  });

  it('strips double quotes from content', () => {
    const { verses } = processPoemContent('"أ"*"ب"');
    expect(verses).toEqual([['أ', 'ب']]);
  });

  it('builds sample from first three lines joined with " * "', () => {
    const { sample } = processPoemContent('أول*ثاني*ثالث*رابع');
    expect(sample).toBe('أول * ثاني * ثالث');
  });

  it('removes tashkeel from the sample', () => {
    const { sample } = processPoemContent('كَتَبَ*قَرَأَ');
    expect(sample).toBe('كتب * قرأ');
  });

  it('builds keywords from all lines without tashkeel', () => {
    const { keywords } = processPoemContent('كَلِمَة*أُخرى');
    expect(keywords).toBe('كلمة,أخرى');
  });

  it('uses empty string fallback when first half of a pair is empty', () => {
    // Content starting with '*' → lines[0] = '' (falsy) → '' fallback used for first half
    const { verses } = processPoemContent('*ب');
    expect(verses).toEqual([['', 'ب']]);
  });

  it('handles a single line (one verse with empty second half)', () => {
    const { verses, verseCount } = processPoemContent('بيت');
    expect(verses).toEqual([['بيت', '']]);
    expect(verseCount).toBe(1);
  });
});
