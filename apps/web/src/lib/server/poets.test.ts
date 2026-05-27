import { ORPCError } from '@orpc/client';
import type { PoetSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poets: { list: vi.fn(), get: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoet, getPoetsPage } from './poets';

const listMock = apiServer.poets.list as unknown as ReturnType<typeof vi.fn>;
const getMock = apiServer.poets.get as unknown as ReturnType<typeof vi.fn>;
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };
const POET = { name: 'ش', slug: 'poet-x' as PoetSlug, poemsCount: 3 };

beforeEach(() => {
  listMock.mockReset();
  getMock.mockReset();
});

describe('getPoetsPage', () => {
  it('maps poets + pagination', async () => {
    listMock.mockResolvedValue({ data: [POET], pagination: PAGINATION });
    const result = await getPoetsPage(1);
    expect(result?.poets).toHaveLength(1);
    expect(result?.pagination.totalItems).toBe(1);
  });
  it('returns null on NOT_FOUND (page out of range)', async () => {
    listMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoetsPage(999)).toBeNull();
  });
});

describe('getPoet', () => {
  it('returns the unwrapped poet on success', async () => {
    getMock.mockResolvedValue({ data: POET });
    const result = await getPoet('poet-x' as PoetSlug);
    expect(result).toEqual(POET);
    expect(getMock).toHaveBeenCalledWith({ slug: 'poet-x' });
  });

  it('returns null on NOT_FOUND', async () => {
    getMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoet('missing' as PoetSlug)).toBeNull();
  });

  it('rethrows on a 500', async () => {
    getMock.mockRejectedValue(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }));
    await expect(getPoet('boom' as PoetSlug)).rejects.toThrow();
  });
});
