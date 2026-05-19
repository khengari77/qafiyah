import { describe, expect, it, vi } from 'vitest';
import { asRhymeSlug } from './brand';
import { listRhymePoems, listRhymes, normalizeRhymePattern } from './rhymes.queries';
import { castPartialAsDbClient, makeChain } from './test-utils';

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

describe('listRhymes', () => {
  it('groups rhymes by Arabic letter and sums counts', async () => {
    const rows = [
      { pattern: 'ب', slug: 'rhyme-b-slug', poemsCount: 10, poetsCount: 5 },
      { pattern: 'باء', slug: 'rhyme-ba-slug', poemsCount: 20, poetsCount: 8 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listRhymes(mockDb))._unsafeUnwrap();
    const baaGroup = value.find((r) => r.name === 'باء');
    expect(baaGroup).toBeDefined();
    expect(baaGroup?.poemsCount).toBe(30);
    expect(baaGroup?.poetsCount).toBe(13);
  });

  it('returns empty array when no rhymes exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listRhymes(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });

  it('ignores rhymes whose pattern does not match any letter', async () => {
    const rows = [{ pattern: 'xyz', slug: 'rhyme-xyz-slug', poemsCount: 5, poetsCount: 2 }];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listRhymes(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('listRhymePoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'ب', poems_count: 30 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'شاعر',
      poet_slug: 'poet-1',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listRhymePoems(mockDb, asRhymeSlug('rhyme-slug'), 1);
    const value = result._unsafeUnwrap();
    expect(value.parent.name).toBe('ب');
    expect(value.poems[0]?.poetSlug).toBe('poet-1');
  });

  it('returns not_found err when rhyme is not found', async () => {
    const mockDb = castPartialAsDbClient({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listRhymePoems(mockDb, asRhymeSlug('nonexistent'), 1);
    expect(result._unsafeUnwrapErr().kind).toBe('not_found');
  });
});
