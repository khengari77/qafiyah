import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPoemExcerpt,
  extractPoemExcerpt,
  pickExcerptStartIndex,
} from './poem-excerpt';

const makePoem = (content: string, poetName = 'شاعر') => ({ poetName, content });

describe('pickExcerptStartIndex', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 0 when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickExcerptStartIndex('أ*ب*ج*د')).toBe(0);
  });

  it('returns an even number', () => {
    for (let i = 0; i < 20; i++) {
      const index = pickExcerptStartIndex('أ*ب*ج*د*هـ*و');
      expect(index % 2).toBe(0);
    }
  });

  it('stays within bounds for a two-line poem', () => {
    for (let i = 0; i < 10; i++) {
      expect(pickExcerptStartIndex('أ*ب')).toBe(0);
    }
  });
});

describe('extractPoemExcerpt', () => {
  it('returns two lines plus poet name', () => {
    const result = extractPoemExcerpt(makePoem('شطر أول*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('returns insufficient_content when poem has fewer than two lines', () => {
    const result = extractPoemExcerpt(makePoem('شطر واحد'), 0);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().kind).toBe('insufficient_content');
    expect(result._unsafeUnwrapErr().lineCount).toBe(1);
  });

  it('strips double quotes from output', () => {
    const result = extractPoemExcerpt(makePoem('"شطر أول"*"شطر ثانٍ"'), 0);
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
  });

  it('includes the poet name in the output', () => {
    const result = extractPoemExcerpt(makePoem('أ*ب', 'المتنبي'), 0);
    expect(result._unsafeUnwrap()).toContain('المتنبي');
  });

  it('uses empty string fallback when line at startIndex is empty', () => {
    const result = extractPoemExcerpt(makePoem('*شطر ثانٍ*شطر ثالث*شطر رابع'), 0);
    expect(result.isOk()).toBe(true);
  });
});

describe('buildPoemExcerpt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns a formatted excerpt for a valid poem', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = buildPoemExcerpt(makePoem('شطر أول*شطر ثانٍ'));
    expect(result._unsafeUnwrap()).toBe('شطر أول\nشطر ثانٍ\n\nشاعر');
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

  it('returns insufficient_content for a single-line poem', () => {
    const result = buildPoemExcerpt(makePoem('شطر واحد'));
    expect(result._unsafeUnwrapErr().kind).toBe('insufficient_content');
  });
});
