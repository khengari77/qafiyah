import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { cleanArabicQuery, searchInputSchema } from './search';

type SearchInput = v.InferOutput<typeof searchInputSchema>;

function parseSearch(input: unknown): SearchInput {
  return v.parse(searchInputSchema, input);
}

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

describe('search input validation', () => {
  it('accepts Arabic text query', () => {
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems' });
    expect(result.q).toBe('قصيدة');
  });

  it('accepts filter-only input with no query', () => {
    const result = parseSearch({
      searchType: 'poems',
      eraSlugs: ['abbasid'],
    });
    expect(result.eraSlugs).toEqual(['abbasid']);
  });

  it('accepts meterSlugs filter', () => {
    const result = parseSearch({
      searchType: 'poems',
      meterSlugs: ['tawil'],
    });
    expect(result.meterSlugs).toEqual(['tawil']);
  });

  it('accepts rhymeSlugs filter', () => {
    const result = parseSearch({
      searchType: 'poems',
      rhymeSlugs: ['meem'],
    });
    expect(result.rhymeSlugs).toEqual(['meem']);
  });

  it('accepts themeSlugs filter', () => {
    const result = parseSearch({
      searchType: 'poems',
      themeSlugs: ['love'],
    });
    expect(result.themeSlugs).toEqual(['love']);
  });

  it('rejects empty query with no filters', () => {
    expect(() => parseSearch({ searchType: 'poems' })).toThrow();
  });

  it('rejects empty query string with no filters', () => {
    expect(() => parseSearch({ q: '', searchType: 'poems' })).toThrow();
  });

  it('rejects whitespace-only query with no filters', () => {
    expect(() => parseSearch({ q: '   ', searchType: 'poems' })).toThrow();
  });

  it('rejects invalid searchType', () => {
    expect(() => parseSearch({ q: 'test', searchType: 'invalid' as 'poems' })).toThrow();
  });

  it('defaults page to 1 when omitted', () => {
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems' });
    expect(result.page).toBe(1);
  });

  it('defaults matchType to "all" when omitted', () => {
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems' });
    expect(result.matchType).toBe('all');
  });

  it('defaults all slug arrays to empty when omitted', () => {
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems' });
    expect(result.meterSlugs).toEqual([]);
    expect(result.eraSlugs).toEqual([]);
    expect(result.rhymeSlugs).toEqual([]);
    expect(result.themeSlugs).toEqual([]);
  });

  it('accepts both text and filters together', () => {
    const result = parseSearch({
      q: 'قصيدة',
      searchType: 'poems',
      eraSlugs: ['abbasid'],
    });
    expect(result.q).toBe('قصيدة');
    expect(result.eraSlugs).toEqual(['abbasid']);
  });

  it('rejects query exceeding max length', () => {
    const longQuery = 'أ'.repeat(201);
    expect(() => parseSearch({ q: longQuery, searchType: 'poems' })).toThrow();
  });
});
