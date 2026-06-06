import type { EraSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    eras: { list: vi.fn(), get: vi.fn() },
    meters: { list: vi.fn(), get: vi.fn() },
    rhymes: { list: vi.fn(), get: vi.fn() },
    themes: { list: vi.fn(), get: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allEras } from './taxonomies';

const erasListMock = apiServer.eras.list as unknown as ReturnType<typeof vi.fn>;

const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };
const ERA = { name: 'الجاهلي', slug: 'jahili' as EraSlug, poemsCount: 31, poetsCount: 12 };

beforeEach(() => {
  erasListMock.mockReset();
});

describe('allEras', () => {
  it('returns the list data', async () => {
    erasListMock.mockResolvedValue({ data: [ERA], pagination: PAGINATION });
    const eras = await allEras();
    expect(eras).toHaveLength(1);
    expect(eras[0]?.poetsCount).toBe(12);
  });
});
