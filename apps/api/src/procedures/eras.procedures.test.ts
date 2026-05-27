import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listErasMock = vi.fn();
const getEraBySlugMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    erasQueries: {
      listEras: listErasMock,
      getEraBySlug: getEraBySlugMock,
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

const singletonBodySchema = v.object({
  data: v.object({
    name: v.string(),
    slug: v.string(),
    poemsCount: v.number(),
    poetsCount: v.number(),
  }),
});

describe('eras procedures', () => {
  beforeEach(() => {
    listErasMock.mockReset();
    getEraBySlugMock.mockReset();
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

  describe('getEraBySlug', () => {
    it('returns era singleton wrapped in { data } on success', async () => {
      getEraBySlugMock.mockResolvedValue(ok(sampleEra));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid');

      expect(res.status).toBe(200);
      const body = await parseJson(res, singletonBodySchema);
      expect(body.data).toEqual(sampleEra);
    });

    it('returns 404 when era not found', async () => {
      getEraBySlugMock.mockResolvedValue(err({ kind: 'not_found', slug: 'nope' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/nope');

      expect(res.status).toBe(404);
    });

    it('returns 500 on sql_error', async () => {
      getEraBySlugMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/boom');

      expect(res.status).toBe(500);
    });
  });
});
