/**
 * Tests for meters routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import meters from './meters.routes';

describe('meters routes', () => {
  it('should return list of meters', async () => {
    const mockMeters = [
      {
        id: 1,
        name: 'الطويل',
        slug: 'al-tawil',
        poemsCount: 100,
        poetsCount: 50,
      },
      {
        id: 2,
        name: 'البسيط',
        slug: 'al-basit',
        poemsCount: 80,
        poetsCount: 40,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockMeters),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(meters, { db });

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should return 404 when meter not found', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(meters, { db });

    const res = await client.$get('/nonexistent/page/1');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return paginated poems for a meter', async () => {
    const mockMeterInfo = [
      {
        meterId: 1,
        meterName: 'الطويل',
        totalPoems: 100,
      },
    ];

    const mockPoems = [
      {
        title: 'Poem 1',
        slug: 'poem-1',
        poetName: 'Poet 1',
      },
    ];

    const db = createMockDb();
    let callCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation((_n: number) => {
            callCount++;
            // First call is limit(1) for meter info
            if (callCount === 1) {
              return Promise.resolve(mockMeterInfo);
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

    const client = createTestClient(meters, { db });

    const res = await client.$get('/test-meter/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).meterDetails).toBeDefined();
    expect((json.data as Record<string, unknown>).poems).toBeDefined();
  });
});
