import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { searchInputSchema } from './search';

type SearchInput = v.InferOutput<typeof searchInputSchema>;
const parseSearch = (input: unknown): SearchInput => v.parse(searchInputSchema, input);

describe('grouped search input', () => {
  it('defaults types to both poems and poets', () => {
    expect(parseSearch({ q: 'حب' }).types).toEqual(['poems', 'poets']);
  });
  it('accepts a single-type (poems only) request', () => {
    expect(parseSearch({ q: 'حب', types: ['poems'] }).types).toEqual(['poems']);
  });
  it('defaults both page params to 1', () => {
    const r = parseSearch({ q: 'حب' });
    expect(r.poemsPage).toBe(1);
    expect(r.poetsPage).toBe(1);
  });
  it('defaults matchType to all and slug arrays to empty', () => {
    const r = parseSearch({ q: 'حب' });
    expect(r.matchType).toBe('all');
    expect(r.poetSlugs).toEqual([]);
    expect(r.eraSlugs).toEqual([]);
    expect(r.meterSlugs).toEqual([]);
    expect(r.rhymeSlugs).toEqual([]);
    expect(r.themeSlugs).toEqual([]);
  });
  it('accepts poetSlugs filter', () => {
    expect(parseSearch({ types: ['poems'], poetSlugs: ['mutanabbi'] }).poetSlugs).toEqual([
      'mutanabbi',
    ]);
  });
  it('rejects an invalid type', () => {
    expect(() => parseSearch({ q: 'حب', types: ['bogus'] as unknown as ['poems'] })).toThrow();
  });
  it('rejects q over max length', () => {
    expect(() => parseSearch({ q: 'أ'.repeat(201) })).toThrow();
  });
});
