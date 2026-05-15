import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils';
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
      context: { db: c.get('db') },
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

type ListBody = {
  data: unknown[];
  pagination: { page: number; pageSize: number; totalPages: number; totalItems: number };
  meta?: { name: string; slug: string; poemsCount: number };
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
      listPoetsMock.mockResolvedValue({ poets: [samplePoet], total: 1, totalPages: 1 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as ListBody;
      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
    });

    it('returns 404 when page has no poets', async () => {
      listPoetsMock.mockResolvedValue({ poets: [], total: 0, totalPages: 0 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets?page=999');

      expect(res.status).toBe(404);
    });

    it('defaults to page 1 when no page is provided', async () => {
      listPoetsMock.mockResolvedValue({ poets: [samplePoet], total: 1, totalPages: 1 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/poets');

      expect(listPoetsMock).toHaveBeenCalledWith(expect.anything(), 1);
    });

    it('passes page number to the query', async () => {
      listPoetsMock.mockResolvedValue({ poets: [samplePoet], total: 1, totalPages: 5 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/poets?page=3');

      expect(listPoetsMock).toHaveBeenCalledWith(expect.anything(), 3);
    });
  });

  describe('listPoetPoems', () => {
    it('returns poet poems with nested sub-resources and meta', async () => {
      listPoetPoemsMock.mockResolvedValue({
        parent: { name: 'المتنبي', slug: 'mutanabbi', poemsCount: 300 },
        poems: [samplePoemRow],
        total: 1,
        totalPages: 1,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/mutanabbi/poems?page=1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as ListBody;
      expect(body.data).toHaveLength(1);
      expect(body.meta?.name).toBe('المتنبي');
    });

    it('returns 404 when poet slug not found', async () => {
      listPoetPoemsMock.mockResolvedValue(null);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poets/unknown-poet/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('passes slug and page to the query', async () => {
      listPoetPoemsMock.mockResolvedValue({
        parent: { name: 'المتنبي', slug: 'mutanabbi', poemsCount: 300 },
        poems: [],
        total: 300,
        totalPages: 10,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/poets/mutanabbi/poems?page=2');

      expect(listPoetPoemsMock).toHaveBeenCalledWith(expect.anything(), 'mutanabbi', 2);
    });
  });
});
