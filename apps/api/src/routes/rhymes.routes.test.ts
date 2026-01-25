/**
 * Tests for rhymes routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import rhymes from './rhymes.routes';

describe('rhymes routes', () => {
  it('should return grouped list of rhymes', async () => {
    const mockRhymes = [
      {
        id: 1,
        pattern: 'ا',
        slug: 'rhyme-1',
        poemsCount: 100,
        poetsCount: 50,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockRhymes),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(rhymes, { db });

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should return 404 when rhyme not found', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(rhymes, { db });

    const res = await client.$get('/nonexistent/page/1');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return paginated poems for a rhyme', async () => {
    const mockRhymeInfo = [
      {
        rhymeId: 1,
        rhymePattern: 'ا',
        totalPoems: 100,
      },
    ];

    const mockPoems = [
      {
        title: 'Poem 1',
        slug: 'poem-1',
        meter: 'Meter 1',
      },
    ];

    const db = createMockDb();
    let callCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation((_n: number) => {
            callCount++;
            // First call is limit(1) for rhyme info
            if (callCount === 1) {
              return Promise.resolve(mockRhymeInfo);
            }
            // Second call is limit(n).offset(m) for poems
            return {
              offset: vi.fn().mockResolvedValue(mockPoems),
            };
          }),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(rhymes, { db });

    const res = await client.$get('/test-rhyme/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).rhymeDetails).toBeDefined();
    expect((json.data as Record<string, unknown>).poems).toBeDefined();
  });
});
