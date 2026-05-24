import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listCollectionsMock = vi.fn();
const listCollectionPoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    collectionsQueries: {
      listCollections: listCollectionsMock,
      listCollectionPoems: listCollectionPoemsMock,
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

const sampleCollection = { name: 'المعلقات', slug: 'muallaqat-uuid', poemsCount: 10 };
const samplePoemRow = {
  title: 'قفا نبك',
  slug: 'poem-1',
  poetName: 'امرؤ القيس',
  poetSlug: 'imru-l-qais',
  meterName: 'الطويل',
  meterSlug: 'altawil',
};

describe('collections procedures', () => {
  beforeEach(() => {
    listCollectionsMock.mockReset();
    listCollectionPoemsMock.mockReset();
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

  describe('listCollectionPoems', () => {
    it('returns collection poems with nested sub-resources and meta', async () => {
      listCollectionPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'المعلقات', slug: 'muallaqat-uuid', poemsCount: 10 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections/muallaqat-uuid/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.meta?.name).toBe('المعلقات');
    });

    it('returns 404 when collection slug not found', async () => {
      listCollectionPoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/collections/unknown/poems?page=1');

      expect(res.status).toBe(404);
    });
  });
});
