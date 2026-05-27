import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listRhymesMock = vi.fn();
const getRhymeBySlugMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    rhymesQueries: {
      listRhymes: listRhymesMock,
      getRhymeBySlug: getRhymeBySlugMock,
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

const singletonBodySchema = v.object({
  data: v.object({
    name: v.string(),
    slug: v.string(),
    poemsCount: v.number(),
    poetsCount: v.number(),
  }),
});

describe('rhymes procedures', () => {
  beforeEach(() => {
    listRhymesMock.mockReset();
    getRhymeBySlugMock.mockReset();
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

  describe('getRhymeBySlug', () => {
    it('returns rhyme singleton wrapped in { data } on success', async () => {
      getRhymeBySlugMock.mockResolvedValue(ok(sampleRhyme));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/meem');

      expect(res.status).toBe(200);
      const body = await parseJson(res, singletonBodySchema);
      expect(body.data).toEqual(sampleRhyme);
    });

    it('returns 404 when rhyme not found', async () => {
      getRhymeBySlugMock.mockResolvedValue(err({ kind: 'not_found', slug: 'nope' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/nope');

      expect(res.status).toBe(404);
    });

    it('returns 500 on sql_error', async () => {
      getRhymeBySlugMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/rhymes/boom');

      expect(res.status).toBe(500);
    });
  });
});
