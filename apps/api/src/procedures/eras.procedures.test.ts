import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils';
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
      context: { db: c.get('db') },
      prefix: '/v1',
    });
    if (!result.matched) return next();
    return transformOrpcResponse(result.response);
  });
  return app;
}

const sampleEra = { name: 'عباسي', slug: 'abbasid', poemsCount: 100, poetsCount: 50 };
const samplePoem = { title: 'قصيدة', slug: 'poem-1', poetName: 'شاعر', meter: 'الطويل' };

describe('eras procedures', () => {
  beforeEach(() => {
    listErasMock.mockReset();
    listEraPoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listEras', () => {
    it('returns eras list with pagination fields', async () => {
      listErasMock.mockResolvedValue([sampleEra]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { eras: unknown[]; total: number; page: number };
      expect(body.eras).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('returns empty list when no eras exist', async () => {
      listErasMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { eras: unknown[]; total: number };
      expect(body.eras).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('listEraPoems', () => {
    it('returns era poems on valid slug and page', async () => {
      listEraPoemsMock.mockResolvedValue({
        eraDetails: { name: 'عباسي', poemsCount: 100 },
        poems: [samplePoem],
        total: 1,
        totalPages: 1,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid/page/1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { poems: unknown[]; page: number };
      expect(body.poems).toHaveLength(1);
      expect(body.page).toBe(1);
    });

    it('returns 404 when era slug not found', async () => {
      listEraPoemsMock.mockResolvedValue(null);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/unknown-era/page/1');

      expect(res.status).toBe(404);
    });

    it('uses the page from input', async () => {
      listEraPoemsMock.mockResolvedValue({
        eraDetails: { name: 'عباسي', poemsCount: 200 },
        poems: [samplePoem],
        total: 200,
        totalPages: 10,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/eras/abbasid/page/3');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { page: number };
      expect(body.page).toBe(3);
      expect(listEraPoemsMock).toHaveBeenCalledWith(expect.anything(), 'abbasid', 3);
    });
  });
});
