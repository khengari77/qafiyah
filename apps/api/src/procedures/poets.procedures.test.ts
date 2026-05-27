import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listPoetsMock = vi.fn();
const getPoetBySlugMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    poetsQueries: {
      listPoets: listPoetsMock,
      getPoetBySlug: getPoetBySlugMock,
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

const samplePoet = { name: 'المتنبي', slug: 'mutanabbi', poemsCount: 300 };

const singletonBodySchema = v.object({
  data: v.object({
    name: v.string(),
    slug: v.string(),
    poemsCount: v.number(),
  }),
});

describe('poets procedures', () => {
  beforeEach(() => {
    listPoetsMock.mockReset();
    getPoetBySlugMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listPoets', () => {
    it('returns poets list wrapped in envelope', async () => {
      listPoetsMock.mockResolvedValue(ok({ poets: [samplePoet], total: 1, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
    });

    it('returns 200 with empty data on page 1 when no poets exist', async () => {
      listPoetsMock.mockResolvedValue(ok({ poets: [], total: 0, totalPages: 0 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
      expect(body.pagination.totalItems).toBe(0);
    });

    it('returns 404 when page exceeds totalPages', async () => {
      listPoetsMock.mockResolvedValue(ok({ poets: [], total: 10, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=999');

      expect(res.status).toBe(404);
    });

    it('defaults to page 1 when no page is provided', async () => {
      listPoetsMock.mockResolvedValue(ok({ poets: [samplePoet], total: 1, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(1);
    });

    it('reflects the requested page in the response', async () => {
      listPoetsMock.mockResolvedValue(ok({ poets: [samplePoet], total: 1, totalPages: 5 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=3');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(3);
    });
  });

  describe('getPoetBySlug', () => {
    it('returns poet singleton wrapped in { data } on success', async () => {
      getPoetBySlugMock.mockResolvedValue(ok(samplePoet));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/mutanabbi');

      expect(res.status).toBe(200);
      const body = await parseJson(res, singletonBodySchema);
      expect(body.data).toEqual(samplePoet);
    });

    it('returns 404 when poet not found', async () => {
      getPoetBySlugMock.mockResolvedValue(err({ kind: 'not_found', slug: 'nope' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/nope');

      expect(res.status).toBe(404);
    });

    it('returns 500 on sql_error', async () => {
      getPoetBySlugMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/boom');

      expect(res.status).toBe(500);
    });
  });
});
