import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
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
    return transformOrpcResponse(result.response, c.req.path);
  });
  return app;
}

const sampleTheme = { name: 'الغزل', slug: 'love', poemsCount: 400 };
const samplePoemRow = {
  title: 'قصيدة',
  slug: 'poem-1',
  poetName: 'شاعر',
  poetSlug: 'shaer',
  meterName: 'الطويل',
  meterSlug: 'tawil',
};

describe('themes procedures', () => {
  beforeEach(() => {
    listThemesMock.mockReset();
    listThemePoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listThemes', () => {
    it('returns themes list wrapped in envelope', async () => {
      listThemesMock.mockResolvedValue([sampleTheme]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.totalItems).toBe(1);
    });

    it('returns empty list when no themes exist', async () => {
      listThemesMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('listThemePoems', () => {
    it('returns theme poems with nested sub-resources and meta', async () => {
      listThemePoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'الغزل', slug: 'love', poemsCount: 400 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes/love/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.meta?.name).toBe('الغزل');
    });

    it('returns 404 when theme slug not found', async () => {
      listThemePoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown-theme' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes/unknown-theme/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('reflects the requested slug and page in the response', async () => {
      listThemePoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'الغزل', slug: 'love', poemsCount: 400 },
          poems: [],
          total: 400,
          totalPages: 14,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/themes/love/poems?page=7');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(7);
      expect(body.meta?.slug).toBe('love');
    });
  });
});
