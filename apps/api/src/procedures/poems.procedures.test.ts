import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { poemResourceResponseSchema, slugListResponseSchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
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
    return transformOrpcResponse(result.response, c.req.path);
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
    meterSlug: 'tawil',
    themeName: 'الغزل',
    themeSlug: 'love',
  },
  clearTitle: 'قصيدة في الحب',
  processedContent: {
    verses: [['الشطر الأول', 'الشطر الثاني']],
    verseCount: 1,
    sample: 'الشطر الأول',
    keywords: 'قصيدة',
  },
  relatedPoems: [
    {
      title: 'قصيدة أخرى',
      slug: 'other-poem',
      poetName: 'شاعر',
      poetSlug: 'shaer',
      meterName: 'الكامل',
      meterSlug: 'kamil',
    },
  ],
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
    it('returns slugs list wrapped in envelope', async () => {
      listAllPoemSlugsMock.mockResolvedValue(['poem-1', 'poem-2']);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(200);
      const body = await parseJson(res, slugListResponseSchema);
      expect(body.data).toEqual(['poem-1', 'poem-2']);
      expect(body.pagination.totalItems).toBe(2);
    });

    it('returns empty list when no poems exist', async () => {
      listAllPoemSlugsMock.mockResolvedValue([]);
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(200);
      const body = await parseJson(res, slugListResponseSchema);
      expect(body.data).toHaveLength(0);
      expect(body.pagination.totalItems).toBe(0);
    });
  });

  describe('getBySlug', () => {
    it('returns poem resource wrapped in { data } envelope', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'found', data: samplePoemData });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/my-poem');

      expect(res.status).toBe(200);
      const body = await parseJson(res, poemResourceResponseSchema);
      expect(body.data.title).toBe('قصيدة في الحب');
      expect(body.data.slug).toBe('my-poem');
      expect(body.data.poet).toEqual({ name: 'المتنبي', slug: 'mutanabbi' });
      expect(body.data.meter).toEqual({ name: 'الطويل', slug: 'tawil' });
      expect(body.data.theme).toEqual({ name: 'الغزل', slug: 'love' });
      expect(body.data.relatedPoems[0]?.poet.slug).toBe('shaer');
    });

    it('returns 404 when poem not found', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'not_found' });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/nonexistent-poem');

      expect(res.status).toBe(404);
    });

    it('returns 500 when poem parse error occurs', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'error', message: 'Invalid content' });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/bad-poem');

      expect(res.status).toBe(500);
    });

    it('passes slug to the query', async () => {
      getPoemBySlugMock.mockResolvedValue({ type: 'found', data: samplePoemData });
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      await client.$get('/v1/poems/specific-slug');

      expect(getPoemBySlugMock).toHaveBeenCalledWith(expect.anything(), 'specific-slug');
    });
  });
});
