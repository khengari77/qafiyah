import { Hono } from 'hono';
import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countResponseSchema,
  listBodySchema,
  poemDetailResponseSchema,
  slugListResponseSchema,
} from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const listPoemSlugsMock = vi.fn();
const countPoemsMock = vi.fn();
const getPoemBySlugMock = vi.fn();
const listPoemsMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    poemsQueries: {
      listPoemSlugs: listPoemSlugsMock,
      countPoems: countPoemsMock,
      getPoemBySlug: getPoemBySlugMock,
      listPoems: listPoemsMock,
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
  displayTitle: 'قصيدة في الحب',
  verseCount: 1,
  parsedContent: {
    verses: [['الشطر الأول', 'الشطر الثاني']],
    sample: 'الشطر الأول',
    keywords: 'قصيدة',
  },
  relatedPoems: [
    {
      title: 'قصيدة أخرى',
      slug: 'opem',
      poetName: 'شاعر',
      poetSlug: 'shaer',
      meterName: 'الكامل',
      meterSlug: 'kamil',
    },
  ],
};

const samplePoemRow = {
  title: 'قصيدة في الحب',
  slug: 'mypm',
  poetName: 'المتنبي',
  poetSlug: 'mutanabbi',
  meterName: 'الطويل',
  meterSlug: 'tawil',
};

describe('poems procedures', () => {
  beforeEach(() => {
    listPoemSlugsMock.mockReset();
    countPoemsMock.mockReset();
    getPoemBySlugMock.mockReset();
    listPoemsMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listSlugs', () => {
    it('returns the requested page of slugs', async () => {
      listPoemSlugsMock.mockResolvedValue(ok(['pone', 'ptwo']));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(200);
      const body = await parseJson(res, slugListResponseSchema);
      expect(body.data).toEqual(['pone', 'ptwo']);
    });

    it('forwards the requested page to the paginated query', async () => {
      listPoemSlugsMock.mockResolvedValue(ok([]));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs?page=2');

      expect(res.status).toBe(200);
      expect(listPoemSlugsMock).toHaveBeenCalledWith(expect.anything(), 2, expect.any(Number));
    });

    it('returns 500 when the slugs query fails', async () => {
      listPoemSlugsMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/slugs');

      expect(res.status).toBe(500);
    });
  });

  describe('count', () => {
    it('returns the total poem count', async () => {
      countPoemsMock.mockResolvedValue(ok(1234));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/count');

      expect(res.status).toBe(200);
      const body = await parseJson(res, countResponseSchema);
      expect(body.data.total).toBe(1234);
    });

    it('returns 500 when the count query fails', async () => {
      countPoemsMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/count');

      expect(res.status).toBe(500);
    });
  });

  describe('get', () => {
    it('returns poem resource wrapped in { data } envelope', async () => {
      getPoemBySlugMock.mockResolvedValue(ok(samplePoemData));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/mypm');

      expect(res.status).toBe(200);
      const body = await parseJson(res, poemDetailResponseSchema);
      expect(body.data.title).toBe('قصيدة في الحب');
      expect(body.data.slug).toBe('mypm');
      expect(body.data.poet).toEqual({ name: 'المتنبي', slug: 'mutanabbi' });
      expect(body.data.meter).toEqual({ name: 'الطويل', slug: 'tawil' });
      expect(body.data.theme).toEqual({ name: 'الغزل', slug: 'love' });
      expect(body.data.relatedPoems[0]?.poet.slug).toBe('shaer');
    });

    it('returns 404 when poem not found', async () => {
      getPoemBySlugMock.mockResolvedValue(err({ kind: 'not_found', slug: 'nope' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/nope');

      expect(res.status).toBe(404);
    });

    it('returns 500 when poem parse error occurs', async () => {
      getPoemBySlugMock.mockResolvedValue(
        err({ kind: 'sql_error', slug: 'bdpm', message: 'Invalid content' })
      );
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/bdpm');

      expect(res.status).toBe(500);
    });

    it('returns 500 when incomplete_poem_data', async () => {
      getPoemBySlugMock.mockResolvedValue(err({ kind: 'incomplete_poem_data', slug: 'bdpm' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems/bdpm');

      expect(res.status).toBe(500);
    });
  });

  describe('list', () => {
    it('returns paginated envelope with no filters', async () => {
      listPoemsMock.mockResolvedValue(ok({ poems: [samplePoemRow], total: 1, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.page).toBe(1);
      expect(listPoemsMock).toHaveBeenCalledWith(
        expect.anything(),
        {
          poetSlugs: [],
          eraSlugs: [],
          themeSlugs: [],
          meterSlugs: [],
          rhymeSlugs: [],
          collectionSlugs: [],
        },
        1
      );
    });

    it('forwards repeated poet filters as an array', async () => {
      listPoemsMock.mockResolvedValue(ok({ poems: [], total: 0, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems?poet%5B0%5D=a&poet%5B1%5D=b');

      expect(res.status).toBe(200);
      expect(listPoemsMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ poetSlugs: ['a', 'b'] }),
        1
      );
    });

    it('forwards the requested page', async () => {
      listPoemsMock.mockResolvedValue(ok({ poems: [], total: 0, totalPages: 5 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems?page=3');

      expect(res.status).toBe(200);
      expect(listPoemsMock).toHaveBeenCalledWith(expect.anything(), expect.any(Object), 3);
    });

    it('returns 500 when listPoems fails', async () => {
      listPoemsMock.mockResolvedValue(err({ kind: 'sql_error', message: 'boom' }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems');

      expect(res.status).toBe(500);
    });

    it('returns 200 with empty data for an unknown filter slug', async () => {
      listPoemsMock.mockResolvedValue(ok({ poems: [], total: 0, totalPages: 1 }));
      const app = await buildOrpcApp();
      const client = createTestClient(app, { db: createMockDb() });

      const res = await client.$get('/v1/poems?poet%5B0%5D=nobody');

      expect(res.status).toBe(200);
      const body = await parseJson(res, listBodySchema);
      expect(body.data).toHaveLength(0);
    });
  });
});
