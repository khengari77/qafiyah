/**
 * Tests for eras routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import eras from './eras.routes';

describe('eras routes', () => {
  it('should return list of eras', async () => {
    const mockEraStats = [
      {
        id: 1,
        name: 'جاهلي',
        slug: 'jahili',
        poetsCount: 100,
        poemsCount: 500,
      },
      {
        id: 2,
        name: 'إسلامي',
        slug: 'islamic',
        poetsCount: 150,
        poemsCount: 600,
      },
    ];

    const db = createMockDb();
    // Mock the select chain
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockEraStats),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(eras, { db });

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should return 404 when era not found', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // Empty result
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(eras, { db });

    const res = await client.$get('/nonexistent/page/1');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
    expect(json.error).toContain('not found');
  });

  it('should return paginated poems for an era', async () => {
    const mockEraInfo = [
      {
        eraId: 1,
        eraName: 'جاهلي',
        totalPoems: 100,
      },
    ];

    const mockPoems = [
      {
        title: 'Poem 1',
        slug: 'poem-1',
        poetName: 'Poet 1',
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
            // First call is limit(1) for era info, return Promise directly
            if (callCount === 1) {
              return Promise.resolve(mockEraInfo);
            }
            // Second call is limit(n).offset(m) for poems, return object with offset
            return {
              offset: vi.fn().mockResolvedValue(mockPoems),
            };
          }),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(eras, { db });

    const res = await client.$get('/jahili/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });
});
