import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils/test-helpers';
import type { AppContext } from '@/types';

const listThemesMock = vi.fn();
const listThemePoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    themesQueries: {
      listThemes: listThemesMock,
      listThemePoems: listThemePoemsMock,
    },
  };
});

async function buildOrpcApp() {
  const { OpenAPIHandler } = await import('@orpc/openapi/fetch');
  const { router } = await import('@/router');
  const { transformOrpcResponse } = await import('@/lib/problem');
  const orpcHandler = new OpenAPIHandler(router);

  const app = new Hono<AppContext>();
  app.use('/v1/*', async (c, next) => {
    const result = await orpcHandler.handle(c.req.raw, {
      context: { db: c.get('db') },
      prefix: '/v1',
    });
    if (!result.matched) return next();
    return transformOrpcResponse(result.response);
  });
  return app;
}

const sampleTheme = { name: 'الغزل', slug: 'love', poemsCount: 400 };
const samplePoem = { title: 'قصيدة', slug: 'poem-1', poetName: 'شاعر', meter: 'الطويل' };

describe('themes procedures', () => {
  beforeEach(() => {
    listThemesMock.mockReset();
    listThemePoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listThemes', () => {
    it('returns themes list with pagination fields', async () => {
      listThemesMock.mockResolvedValue([sampleTheme]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { themes: unknown[]; total: number; page: number };
      expect(body.themes).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('returns empty list when no themes exist', async () => {
      listThemesMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { themes: unknown[]; total: number };
      expect(body.themes).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('listThemePoems', () => {
    it('returns theme poems on valid slug and page', async () => {
      listThemePoemsMock.mockResolvedValue({
        themeDetails: { name: 'الغزل', poemsCount: 400 },
        poems: [samplePoem],
        total: 1,
        totalPages: 1,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes/love/page/1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { poems: unknown[]; page: number };
      expect(body.poems).toHaveLength(1);
      expect(body.page).toBe(1);
    });

    it('returns 404 when theme slug not found', async () => {
      listThemePoemsMock.mockResolvedValue(null);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes/unknown-theme/page/1');

      expect(res.status).toBe(404);
    });

    it('passes slug and page to the query', async () => {
      listThemePoemsMock.mockResolvedValue({
        themeDetails: { name: 'الغزل', poemsCount: 400 },
        poems: [],
        total: 400,
        totalPages: 20,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/themes/love/page/7');

      expect(listThemePoemsMock).toHaveBeenCalledWith(expect.anything(), 'love', 7);
    });
  });
});
