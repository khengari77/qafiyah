import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listErasMock = vi.fn();
const listEraPoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    erasQueries: {
      listEras: listErasMock,
      listEraPoems: listEraPoemsMock,
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

const sampleEra = { name: 'عباسي', slug: 'abbasid', poemsCount: 100, poetsCount: 50 };
const samplePoemRow = {
  title: 'قصيدة',
  slug: 'pone',
  poetName: 'شاعر',
  poetSlug: 'shaer',
  meterName: 'الطويل',
  meterSlug: 'taweel',
};

describe('eras procedures', () => {
  beforeEach(() => {
    listErasMock.mockReset();
    listEraPoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listEras', () => {
    it('returns eras list wrapped in envelope', async () => {
      listErasMock.mockResolvedValue(ok([sampleEra]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.totalItems).toBe(1);
      expect(body.pagination.page).toBe(1);
    });

    it('returns empty list when no eras exist', async () => {
      listErasMock.mockResolvedValue(ok([]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
      expect(body.pagination.totalItems).toBe(0);
    });
  });

  describe('listEraPoems', () => {
    it('returns poems with nested sub-resources and meta', async () => {
      listEraPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'عباسي', slug: 'abbasid', poemsCount: 100 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
      expect(body.meta).toEqual({ name: 'عباسي', slug: 'abbasid', poemsCount: 100 });
      const poem = body.data[0] as {
        poet: { name: string; slug: string };
        meter: { name: string; slug: string };
      };
      expect(poem.poet).toEqual({ name: 'شاعر', slug: 'shaer' });
      expect(poem.meter).toEqual({ name: 'الطويل', slug: 'taweel' });
    });

    it('returns 404 when era slug not found', async () => {
      listEraPoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown-era' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/unknown-era/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('defaults to page 1 when no page query is provided', async () => {
      listEraPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'عباسي', slug: 'abbasid', poemsCount: 200 },
          poems: [samplePoemRow],
          total: 200,
          totalPages: 7,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid/poems');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(1);
    });

    it('passes page from query string to the query', async () => {
      listEraPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'عباسي', slug: 'abbasid', poemsCount: 200 },
          poems: [samplePoemRow],
          total: 200,
          totalPages: 7,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid/poems?page=3');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(3);
    });
  });
});
