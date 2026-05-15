import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils';
import type { AppContext } from '@/types';

const listMetersMock = vi.fn();
const listMeterPoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    metersQueries: {
      listMeters: listMetersMock,
      listMeterPoems: listMeterPoemsMock,
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

const sampleMeter = { name: 'الطويل', slug: 'tawil', poemsCount: 500, poetsCount: 200 };
const samplePoem = { title: 'قصيدة', slug: 'poem-1', poetName: 'شاعر' };

describe('meters procedures', () => {
  beforeEach(() => {
    listMetersMock.mockReset();
    listMeterPoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listMeters', () => {
    it('returns meters list with pagination fields', async () => {
      listMetersMock.mockResolvedValue([sampleMeter]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { meters: unknown[]; total: number; page: number };
      expect(body.meters).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('returns empty list when no meters exist', async () => {
      listMetersMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { meters: unknown[]; total: number };
      expect(body.meters).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('listMeterPoems', () => {
    it('returns meter poems on valid slug and page', async () => {
      listMeterPoemsMock.mockResolvedValue({
        meterDetails: { name: 'الطويل', poemsCount: 500 },
        poems: [samplePoem],
        total: 1,
        totalPages: 1,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters/tawil/page/1');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { poems: unknown[]; page: number };
      expect(body.poems).toHaveLength(1);
      expect(body.page).toBe(1);
    });

    it('returns 404 when meter slug not found', async () => {
      listMeterPoemsMock.mockResolvedValue(null);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters/unknown-meter/page/1');

      expect(res.status).toBe(404);
    });

    it('passes slug and page to the query', async () => {
      listMeterPoemsMock.mockResolvedValue({
        meterDetails: { name: 'الطويل', poemsCount: 500 },
        poems: [],
        total: 500,
        totalPages: 25,
      });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/meters/tawil/page/5');

      expect(listMeterPoemsMock).toHaveBeenCalledWith(expect.anything(), 'tawil', 5);
    });
  });
});
