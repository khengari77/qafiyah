/**
 * Tests for poets routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import poets from './poets.routes';

describe('poets routes', () => {
  it('should return paginated list of poets', async () => {
    const mockPoets = [
      {
        id: 1,
        name: 'Poet 1',
        slug: 'poet-1',
        eraId: 1,
        poemsCount: 50,
      },
      {
        id: 2,
        name: 'Poet 2',
        slug: 'poet-2',
        eraId: 1,
        poemsCount: 60,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(mockPoets),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;
    db.$count = vi.fn().mockResolvedValue(100);

    const client = createTestClient(poets, { db });

    const res = await client.$get('/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect((json.data as Record<string, unknown>).poets).toBeDefined();
    // Pagination is in meta.pagination for paginated responses
    expect(json.meta).toBeDefined();
    expect((json.meta as Record<string, unknown>).pagination).toBeDefined();
  });

  it('should return 404 when page has no poets', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(poets, { db });

    const res = await client.$get('/page/999');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return poet by slug', async () => {
    const mockPoetInfo = [
      {
        poetId: 1,
        poetName: 'Poet Name',
        totalPoems: 50,
      },
    ];

    const mockEraInfo = [
      {
        eraName: 'Era Name',
        eraSlug: 'era-slug',
      },
    ];

    const db = createMockDb();
    let callCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve(callCount === 1 ? mockPoetInfo : mockEraInfo);
          }),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(poets, { db });

    const res = await client.$get('/slug/test-poet');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).poet).toBeDefined();
  });

  it('should return 404 when poet not found by slug', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(poets, { db });

    const res = await client.$get('/slug/nonexistent');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return paginated poems for a poet', async () => {
    const mockPoetInfo = [
      {
        poetId: 1,
        poetName: 'Poet Name',
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
            // First call is limit(1) for poet info
            if (callCount === 1) {
              return Promise.resolve(mockPoetInfo);
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

    const client = createTestClient(poets, { db });

    const res = await client.$get('/test-poet/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).poetDetails).toBeDefined();
    expect((json.data as Record<string, unknown>).poems).toBeDefined();
  });
});
