import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listCollectionsMock = vi.fn();
const getCollectionBySlugMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    collectionsQueries: {
      listCollections: listCollectionsMock,
      getCollectionBySlug: getCollectionBySlugMock,
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

const sampleCollection = { name: 'المعلقات', slug: 'almuallaqat', poemsCount: 10 };

const singletonBodySchema = v.object({
  data: v.object({
    name: v.string(),
    slug: v.string(),
    poemsCount: v.number(),
  }),
});

describe('collections procedures', () => {
  beforeEach(() => {
    listCollectionsMock.mockReset();
    getCollectionBySlugMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listCollections', () => {
    it('returns collections list wrapped in envelope', async () => {
      listCollectionsMock.mockResolvedValue(ok([sampleCollection]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.totalItems).toBe(1);
    });

    it('returns empty list when no collections exist', async () => {
      listCollectionsMock.mockResolvedValue(ok([]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('getCollectionBySlug', () => {
    it('returns collection singleton wrapped in { data } on success', async () => {
      getCollectionBySlugMock.mockResolvedValue(ok(sampleCollection));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections/almuallaqat');

      expect(res.status).toBe(200);
      const body = await parseJson(res, singletonBodySchema);
      expect(body.data).toEqual(sampleCollection);
    });

    it('returns 404 when collection not found', async () => {
      getCollectionBySlugMock.mockResolvedValue(err({ kind: 'not_found', slug: 'nope' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections/nope');

      expect(res.status).toBe(404);
    });

    it('returns 500 on sql_error', async () => {
      getCollectionBySlugMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections/boom');

      expect(res.status).toBe(500);
    });
  });
});
