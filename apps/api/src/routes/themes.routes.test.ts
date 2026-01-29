/**
 * Tests for themes routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import themes from './themes.routes';

describe('themes routes', () => {
  it('should return list of themes sorted by poems count', async () => {
    const mockThemes = [
      {
        id: 1,
        name: 'Theme 1',
        slug: 'theme-1',
        poemsCount: 200,
        poetsCount: 100,
      },
      {
        id: 2,
        name: 'Theme 2',
        slug: 'theme-2',
        poemsCount: 150,
        poetsCount: 80,
      },
    ];

    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockThemes),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(themes, { db });

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should return 404 when theme not found', async () => {
    const db = createMockDb();
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    db.select = mockSelect as typeof db.select;

    const client = createTestClient(themes, { db });

    const res = await client.$get('/nonexistent/page/1');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return paginated poems for a theme', async () => {
    const mockThemeInfo = [
      {
        themeId: 1,
        themeName: 'Theme Name',
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
            // First call is limit(1) for theme info
            if (callCount === 1) {
              return Promise.resolve(mockThemeInfo);
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

    const client = createTestClient(themes, { db });

    const res = await client.$get('/test-theme/page/1');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).themeDetails).toBeDefined();
    expect((json.data as Record<string, unknown>).poems).toBeDefined();
  });
});
