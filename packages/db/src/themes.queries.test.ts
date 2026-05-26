import { describe, expect, it, vi } from 'vitest';
import { asThemeSlug } from './brand';
import { castPartialAsDbClient, makeChain, withTestDb } from './test-utils';
import { getThemeBySlug, listThemes } from './themes.queries';

describe('listThemes', () => {
  it('returns themes sorted by poemsCount descending', async () => {
    const rows = [
      { name: 'رثاء', slug: 'ritha', poemsCount: 10 },
      { name: 'غزل', slug: 'ghazal', poemsCount: 50 },
    ];
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const value = (await listThemes(mockDb))._unsafeUnwrap();
    expect(value[0]?.name).toBe('غزل');
    expect(value[1]?.name).toBe('رثاء');
  });

  it('returns empty array when no themes exist', async () => {
    const mockDb = castPartialAsDbClient({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const value = (await listThemes(mockDb))._unsafeUnwrap();
    expect(value).toEqual([]);
  });
});

describe('getThemeBySlug (integration)', () => {
  it('returns the matching theme stats row', async () => {
    await withTestDb(async (db) => {
      const result = await getThemeBySlug(db, asThemeSlug('almadih'));
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      expect(result.value.slug).toBe('almadih');
      expect(typeof result.value.name).toBe('string');
      expect(result.value.poemsCount).toBeGreaterThan(0);
    });
  });

  it('returns not_found for an unknown slug', async () => {
    await withTestDb(async (db) => {
      const result = await getThemeBySlug(db, asThemeSlug('not-a-real-slug-zzz'));
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;
      expect(result.error.kind).toBe('not_found');
    });
  });
});
