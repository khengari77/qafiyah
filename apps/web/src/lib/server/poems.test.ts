import { ORPCError } from '@orpc/client';
import type { PoemSlug, PoetSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poems: { get: vi.fn(), list: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoem, listPoems } from './poems';

const getMock = apiServer.poems.get as unknown as ReturnType<typeof vi.fn>;
const listMock = apiServer.poems.list as unknown as ReturnType<typeof vi.fn>;

const POEM = {
  title: 'قصيدة',
  slug: 'a-poem' as PoemSlug,
  verses: [['شطر', 'شطر']],
  verseCount: 1,
  sample: 'شطر',
  keywords: 'k',
  poet: { name: 'شاعر', slug: 'poet-x' },
  era: { name: 'الجاهلي', slug: 'jahili' },
  meter: { name: 'الطويل', slug: 'altaweel' },
  theme: { name: 'مدح', slug: 'theme-1' },
  relatedPoems: [],
};

const POEM_ROW = {
  title: 'ت',
  slug: 'p1',
  poet: { name: 'ش', slug: 'poet-x' },
  meter: { name: 'م', slug: 'meter-x' },
};
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };

describe('getPoem', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns the unwrapped poem on success', async () => {
    getMock.mockResolvedValue({ data: POEM });
    const result = await getPoem('a-poem' as PoemSlug);
    expect(result).toEqual(POEM);
    expect(getMock).toHaveBeenCalledWith({ slug: 'a-poem' });
  });

  it('returns null on NOT_FOUND', async () => {
    getMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoem('missing' as PoemSlug)).toBeNull();
  });

  it('rethrows on a 500 (a genuine server error is not a missing poem)', async () => {
    getMock.mockRejectedValue(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }));
    await expect(getPoem('boom' as PoemSlug)).rejects.toThrow();
  });

  it('rethrows unexpected (non-ORPCError) errors', async () => {
    getMock.mockRejectedValue(new Error('network down'));
    await expect(getPoem('boom' as PoemSlug)).rejects.toThrow('network down');
  });
});

describe('listPoems', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('maps poems + pagination on success', async () => {
    listMock.mockResolvedValue({ data: [POEM_ROW], pagination: PAGINATION });
    const result = await listPoems({ poetSlugs: ['poet-x' as PoetSlug] }, 1);
    expect(result?.poems).toHaveLength(1);
    expect(result?.pagination.totalPages).toBe(1);
    expect(listMock).toHaveBeenCalledWith({
      page: '1',
      poet: ['poet-x'],
      era: [],
      theme: [],
      meter: [],
      rhyme: [],
      collection: [],
    });
  });

  it('returns null when page is past the last page', async () => {
    listMock.mockResolvedValue({
      data: [],
      pagination: { page: 99, pageSize: 30, totalPages: 1, totalItems: 1 },
    });
    expect(await listPoems({}, 99)).toBeNull();
  });

  it('rethrows on a 500', async () => {
    listMock.mockRejectedValue(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }));
    await expect(listPoems({}, 1)).rejects.toThrow();
  });
});
