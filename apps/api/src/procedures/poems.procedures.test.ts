import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils/test-helpers';
import type { AppContext } from '@/types';

const listAllPoemSlugsMock = vi.fn();
const getPoemBySlugMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    poemsQueries: {
      listAllPoemSlugs: listAllPoemSlugsMock,
      getPoemBySlug: getPoemBySlugMock,
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

const samplePoemData = {
  metadata: {
    poetName: 'المتنبي',
    poetSlug: 'mutanabbi',
    eraName: 'عباسي',
    eraSlug: 'abbasid',
    meterName: 'الطويل',
    themeName: 'الغزل',
  },
  clearTitle: 'قصيدة في الحب',
  processedContent: {
    verses: [['الشطر الأول', 'الشطر الثاني']],
    verseCount: 1,
    sample: 'الشطر الأول',
    keywords: 'قصيدة',
  },
  relatedPoems: [{ title: 'قصيدة أخرى', slug: 'other-poem', poetName: 'شاعر', meter: 'الكامل' }],
};

describe('poems procedures', () => {
  beforeEach(() => {
    listAllPoemSlugsMock.mockReset();
    getPoemBySlugMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listSlugs', () => {
    it('returns slugs list and total', async () => {
      listAllPoemSlugsMock.mockResolvedValue({ slugs: ['poem-1', 'poem-2'], total: 2 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { slugs: string[]; total: number };
      expect(body.slugs).toEqual(['poem-1', 'poem-2']);
      expect(body.total).toBe(2);
    });

    it('returns empty list when no poems exist', async () => {
      listAllPoemSlugsMock.mockResolvedValue({ slugs: [], total: 0 });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { slugs: string[]; total: number };
      expect(body.slugs).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('getBySlug', () => {
    it('returns poem data when found', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'found', data: samplePoemData });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slug/my-poem');

      expect(res.status).toBe(200);
      const body = (await res.json()) as typeof samplePoemData;
      expect(body.clearTitle).toBe('قصيدة في الحب');
      expect(body.metadata.poetName).toBe('المتنبي');
    });

    it('returns 404 when poem not found', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'not_found' });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slug/nonexistent-poem');

      expect(res.status).toBe(404);
    });

    it('returns 500 when poem parse error occurs', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'error', message: 'Invalid content' });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slug/bad-poem');

      expect(res.status).toBe(500);
    });

    it('passes slug to the query', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'found', data: samplePoemData });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/poems/slug/specific-slug');

      expect(getPoemBySlugMock).toHaveBeenCalledWith(expect.anything(), 'specific-slug');
    });
  });
});
