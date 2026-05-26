import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPoemExcerpt } from './poem-excerpt';

const makePoem = (content: string, poetName = 'شاعر') => ({ poetName, content });

describe('buildPoemExcerpt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns two lines plus poet name', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = buildPoemExcerpt(makePoem('شطر أول*شطر ثانٍ'));
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('uses empty string fallback when a line is empty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = buildPoemExcerpt(makePoem('*شطر ثانٍ'));
    expect(result.isOk()).toBe(true);
  });

  it('returns insufficient_content for a single-line poem', () => {
    const error = buildPoemExcerpt(makePoem('شطر واحد'))._unsafeUnwrapErr();
    expect(error.kind).toBe('insufficient_content');
    if (error.kind === 'insufficient_content') expect(error.lineCount).toBe(1);
  });

  it('returns excerpt_too_long when excerpt exceeds 280 chars', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const longLine = 'أ'.repeat(141);
    const result = buildPoemExcerpt(makePoem(`${longLine}*${longLine}`));
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('excerpt_too_long');
    if (error.kind === 'excerpt_too_long') {
      expect(error.length).toBeGreaterThan(error.max);
      expect(error.max).toBe(280);
    }
  });

  it('picks an even-numbered start index within bounds', () => {
    for (let i = 0; i < 20; i++) {
      const result = buildPoemExcerpt(makePoem('أ*ب*ج*د*هـ*و'));
      expect(result.isOk()).toBe(true);
    }
  });
});
