import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { searchInputSchema } from './search';

type SearchInput = v.InferOutput<typeof searchInputSchema>;

function parseSearch(input: unknown): SearchInput {
  return v.parse(searchInputSchema, input);
}

describe('search input validation', () => {
  it('accepts an Arabic text query unchanged (no server-side cleaning)', () => {
    expect(parseSearch({ q: 'قصيدة', searchType: 'poems' }).q).toBe('قصيدة');
  });

  it('accepts filter-only input with no query', () => {
    const result = parseSearch({ searchType: 'poems', eraSlugs: ['abbasid'] });
    expect(result.eraSlugs).toEqual(['abbasid']);
  });

  it('accepts meter, rhyme, and theme slug filters', () => {
    const result = parseSearch({
      searchType: 'poems',
      meterSlugs: ['tawil'],
      rhymeSlugs: ['meem'],
      themeSlugs: ['love'],
    });
    expect(result.meterSlugs).toEqual(['tawil']);
    expect(result.rhymeSlugs).toEqual(['meem']);
    expect(result.themeSlugs).toEqual(['love']);
  });

  it('rejects empty query with no filters', () => {
    expect(() => parseSearch({ searchType: 'poems' })).toThrow();
    expect(() => parseSearch({ q: '', searchType: 'poems' })).toThrow();
  });

  it('rejects invalid searchType', () => {
    expect(() => parseSearch({ q: 'test', searchType: 'invalid' as 'poems' })).toThrow();
  });

  it('defaults page to 1 and matchType to all when omitted', () => {
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems' });
    expect(result.page).toBe(1);
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
    const result = parseSearch({ q: 'قصيدة', searchType: 'poems', eraSlugs: ['abbasid'] });
    expect(result.q).toBe('قصيدة');
    expect(result.eraSlugs).toEqual(['abbasid']);
  });

  it('rejects a query exceeding max length', () => {
    expect(() => parseSearch({ q: 'أ'.repeat(201), searchType: 'poems' })).toThrow();
  });
});
