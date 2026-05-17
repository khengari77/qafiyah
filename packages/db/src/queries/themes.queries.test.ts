import { describe, expect, it, vi } from 'vitest';
import { asThemeSlug } from './brand';
import { fakeDb, makeChain } from './test-utils';
import { listThemePoems, listThemes } from './themes.queries';

describe('listThemes', () => {
  it('returns themes sorted by poemsCount descending', async () => {
    const rows = [
      { name: 'رثاء', slug: 'ritha', poemsCount: 10 },
      { name: 'غزل', slug: 'ghazal', poemsCount: 50 },
    ];
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain(rows)) }),
    });

    const result = await listThemes(mockDb);
    expect(result[0]?.name).toBe('غزل');
    expect(result[1]?.name).toBe('رثاء');
  });

  it('returns empty array when no themes exist', async () => {
    const mockDb = fakeDb({
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(makeChain([])) }),
    });

    const result = await listThemes(mockDb);
    expect(result).toEqual([]);
  });
});

describe('listThemePoems', () => {
  it('returns parent and poems with nested slugs', async () => {
    const parentRow = { name: 'غزل', poems_count: 40 };
    const poemRow = {
      title: 'قصيدة',
      slug: 'poem-slug',
      poet_name: 'شاعر',
      poet_slug: 'poet-1',
      meter_name: 'الطويل',
      meter_slug: 'altawil',
    };
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([parentRow]).mockResolvedValueOnce([poemRow]),
    });

    const result = await listThemePoems(mockDb, asThemeSlug('ghazal'), 1);
    expect(result?.parent.name).toBe('غزل');
    expect(result?.poems[0]?.meterSlug).toBe('altawil');
  });

  it('returns null when theme is not found', async () => {
    const mockDb = fakeDb({
      execute: vi.fn().mockResolvedValueOnce([]),
    });

    const result = await listThemePoems(mockDb, asThemeSlug('nonexistent'), 1);
    expect(result).toBeNull();
  });
});
