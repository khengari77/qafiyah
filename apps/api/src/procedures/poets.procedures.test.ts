import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listPoetsMock = vi.fn();
const listPoetPoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    poetsQueries: {
      listPoets: listPoetsMock,
      listPoetPoems: listPoetPoemsMock,
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
const samplePoemRow = {
  title: 'قصيدة',
  slug: 'poem-1',
  poetName: 'المتنبي',
  poetSlug: 'mutanabbi',
  meterName: 'الطويل',
  meterSlug: 'tawil',
};

describe('poets procedures', () => {
  beforeEach(() => {
    listPoetsMock.mockReset();
    listPoetPoemsMock.mockReset();
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

  describe('listPoetPoems', () => {
    it('returns poet poems with nested sub-resources and meta', async () => {
      listPoetPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'المتنبي', slug: 'mutanabbi', poemsCount: 300 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/mutanabbi/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.meta?.name).toBe('المتنبي');
    });

    it('returns 404 when poet slug not found', async () => {
      listPoetPoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown-poet' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/unknown-poet/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('reflects the requested slug and page in the response', async () => {
      listPoetPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'المتنبي', slug: 'mutanabbi', poemsCount: 300 },
          poems: [],
          total: 300,
          totalPages: 10,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/mutanabbi/poems?page=2');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(2);
      expect(body.meta?.slug).toBe('mutanabbi');
    });
  });
});
