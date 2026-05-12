import { describe, expect, it } from 'vitest';
import { cleanArabicQuery } from './clean-arabic-query';

describe('cleanArabicQuery', () => {
  it('passes through a clean Arabic string unchanged', () => {
    expect(cleanArabicQuery('قصيدة عربية')).toBe('قصيدة عربية');
  });

  it('strips Latin characters', () => {
    expect(cleanArabicQuery('hello world')).toBe('');
  });

  it('strips ASCII symbols and numbers', () => {
    expect(cleanArabicQuery('123!@#قصيدة')).toBe('قصيدة');
  });

  it('collapses multiple spaces into one', () => {
    expect(cleanArabicQuery('قصيدة   عربية')).toBe('قصيدة عربية');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanArabicQuery('  قصيدة  ')).toBe('قصيدة');
  });

  it('returns empty string for empty input', () => {
    expect(cleanArabicQuery('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(cleanArabicQuery('   ')).toBe('');
  });

  it('keeps Arabic extended Unicode blocks', () => {
    const arabicExtended = 'ݐݿ';
    expect(cleanArabicQuery(arabicExtended)).toBe(arabicExtended);
  });

  it('strips mixed Latin and Arabic, preserving only Arabic parts', () => {
    expect(cleanArabicQuery('شعر poetry شعر')).toBe('شعر شعر');
  });
});
