import { ORPCError } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poems: { getPoemBySlug: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoem } from './poems';

const getMock = apiServer.poems.getPoemBySlug as unknown as ReturnType<typeof vi.fn>;

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

  it('rethrows unexpected errors', async () => {
    getMock.mockRejectedValue(new ORPCError('POEM_PARSE_ERROR', { defined: true, status: 500 }));
    await expect(getPoem('boom' as PoemSlug)).rejects.toThrow();
  });
});
