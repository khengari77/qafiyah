import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils';
import type { AppContext } from '@/types';

const listRhymesMock = vi.fn();
const listRhymePoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    rhymesQueries: {
      listRhymes: listRhymesMock,
      listRhymePoems: listRhymePoemsMock,
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

const sampleRhyme = { name: 'الميم', slug: 'meem', poemsCount: 150, poetsCount: 80 };
const samplePoem = { title: 'قصيدة', slug: 'poem-1', meter: 'الطويل' };

describe('rhymes procedures', () => {
  beforeEach(() => {
    listRhymesMock.mockReset();
    listRhymePoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listRhymes', () => {
    it('returns rhymes list with pagination fields', async () => {
      listRhymesMock.mockResolvedValue([sampleRhyme]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { rhymes: unknown[]; total: number; page: number };
      expect(body.rhymes).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('returns empty list when no rhymes exist', async () => {
      listRhymesMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { rhymes: unknown[]; total: number };
      expect(body.rhymes).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('listRhymePoems', () => {
    it('returns rhyme poems on valid slug and page', async () => {
      listRhymePoemsMock.mockResolvedValue({
        rhymeDetails: { pattern: 'م', poemsCount: 150 },
        poems: [samplePoem],
        total: 1,
        totalPages: 1,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/meem/page/1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { poems: unknown[]; page: number };
      expect(body.poems).toHaveLength(1);
      expect(body.page).toBe(1);
    });

    it('returns 404 when rhyme slug not found', async () => {
      listRhymePoemsMock.mockResolvedValue(null);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/unknown-rhyme/page/1');

      expect(res.status).toBe(404);
    });

    it('passes slug and page to the query', async () => {
      listRhymePoemsMock.mockResolvedValue({
        rhymeDetails: { pattern: 'م', poemsCount: 150 },
        poems: [],
        total: 150,
        totalPages: 8,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/rhymes/meem/page/4');

      expect(listRhymePoemsMock).toHaveBeenCalledWith(expect.anything(), 'meem', 4);
    });
  });
});
