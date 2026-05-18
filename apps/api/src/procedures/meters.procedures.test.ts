import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
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
    return transformOrpcResponse(result.response, c.req.path);
  });
  return app;
}

const sampleMeter = { name: 'الطويل', slug: 'tawil', poemsCount: 500, poetsCount: 200 };
const samplePoemRow = {
  title: 'قصيدة',
  slug: 'poem-1',
  poetName: 'شاعر',
  poetSlug: 'shaer',
  meterName: 'الطويل',
  meterSlug: 'tawil',
};

describe('meters procedures', () => {
  beforeEach(() => {
    listMetersMock.mockReset();
    listMeterPoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listMeters', () => {
    it('returns meters list wrapped in envelope', async () => {
      listMetersMock.mockResolvedValue([sampleMeter]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.totalItems).toBe(1);
    });

    it('returns empty list when no meters exist', async () => {
      listMetersMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('listMeterPoems', () => {
    it('returns meter poems with nested sub-resources and meta', async () => {
      listMeterPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'الطويل', slug: 'tawil', poemsCount: 500 },
          poems: [samplePoemRow],
          total: 1,
          totalPages: 1,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters/tawil/poems?page=1');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.meta?.slug).toBe('tawil');
    });

    it('returns 404 when meter slug not found', async () => {
      listMeterPoemsMock.mockResolvedValue(err({ kind: 'not_found', slug: 'unknown-meter' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters/unknown-meter/poems?page=1');

      expect(res.status).toBe(404);
    });

    it('reflects the requested slug and page in the response', async () => {
      listMeterPoemsMock.mockResolvedValue(
        ok({
          parent: { name: 'الطويل', slug: 'tawil', poemsCount: 500 },
          poems: [],
          total: 500,
          totalPages: 17,
        })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/meters/tawil/poems?page=5');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.pagination.page).toBe(5);
      expect(body.meta?.slug).toBe('tawil');
    });
  });
});
