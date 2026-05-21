import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
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
      context: { db: c.get('db'), es: c.get('es') },
      prefix: '/v1',
    });
    if (!result.matched) return next();
    return transformOrpcResponse(result.response, c.req.path);
  });
  return app;
}

const sampleRhyme = { name: 'الميم', slug: 'meem', poemsCount: 150, poetsCount: 80 };
const samplePoemRow = {
  title: 'قصيدة',
  slug: 'poem-1',
  poetName: 'شاعر',
  poetSlug: 'shaer',
  meterName: 'الطويل',
  meterSlug: 'tawil',
};

describe('rhymes procedures', () => {
  beforeEach(() => {
    listRhymesMock.mockReset();
    listRhymePoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listRhymes', () => {
    it('returns rhymes list wrapped in envelope', async () => {
      listRhymesMock.mockResolvedValue(ok([sampleRhyme]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.totalItems).toBe(1);
    });

    it('returns empty list when no rhymes exist', async () => {
      listRhymesMock.mockResolvedValue(ok([]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('listRhymePoems', () => {
    it('returns rhyme poems with nested sub-resources and meta', async () => {
      listRhymePoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'م', slug: 'meem', poemsCount: 150 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/meem/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.meta?.name).toBe('م');
    });

    it('returns 404 when rhyme slug not found', async () => {
      listRhymePoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown-rhyme' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/unknown-rhyme/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('reflects the requested slug and page in the response', async () => {
      listRhymePoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'م', slug: 'meem', poemsCount: 150 },
          poems: [],
          total: 150,
          totalPages: 5,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/meem/poems?page=4');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(4);
      expect(body.meta?.slug).toBe('meem');
    });
  });
});
