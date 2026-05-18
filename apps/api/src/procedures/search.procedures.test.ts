import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const searchPoemsMock = vi.fn();
const searchPoetsMock = vi.fn();
const browsePoemsByFiltersMock = vi.fn();
const browsePoetsByFiltersMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    searchQueries: {
      searchPoems: searchPoemsMock,
      searchPoets: searchPoetsMock,
      browsePoemsByFilters: browsePoemsByFiltersMock,
      browsePoetsByFilters: browsePoetsByFiltersMock,
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

const samplePoemRow = {
  poetName: 'p',
  poetEra: 'e',
  poetEraSlug: 'e-slug',
  poetSlug: 'p-slug',
  poemTitle: 't',
  poemSnippet: 'x',
  poemMeter: 'm',
  poemMeterSlug: 'm-slug',
  poemSlug: 'poem-slug',
  relevance: 0,
};

const samplePoetRow = {
  poetName: 'p',
  poetEra: 'e',
  poetEraSlug: 'e-slug',
  poetSlug: 'p-slug',
  poetBio: '',
  relevance: 0,
};

describe('search procedure', () => {
  beforeEach(() => {
    searchPoemsMock.mockReset();
    searchPoetsMock.mockReset();
    browsePoemsByFiltersMock.mockReset();
    browsePoetsByFiltersMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty q with no filters (400)', async () => {
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems');
    expect(res.status).toBe(400);
    expect(searchPoemsMock).not.toHaveBeenCalled();
    expect(browsePoemsByFiltersMock).not.toHaveBeenCalled();
  });

  it('text-only Arabic query calls searchPoems, not the filter-only path', async () => {
    searchPoemsMock.mockResolvedValue({ rows: [samplePoemRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    expect(searchPoemsMock).toHaveBeenCalledTimes(1);
    expect(browsePoemsByFiltersMock).not.toHaveBeenCalled();
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poems');
    expect(body.pagination.totalItems).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.type).toBe('poem');
  });

  it('filter-only call routes to browsePoemsByFilters', async () => {
    browsePoemsByFiltersMock.mockResolvedValue({ rows: [samplePoemRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(browsePoemsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoemsMock).not.toHaveBeenCalled();
    const args = browsePoemsByFiltersMock.mock.calls[0]?.[0];
    expect(args?.page).toBe(1);
    expect(args?.filters?.meterSlugs).toBeNull();
    expect(args?.filters?.eraSlugs).toEqual(['abbasid']);
  });

  it('non-Arabic text + filter sanitizes to empty and uses filter-only path', async () => {
    browsePoemsByFiltersMock.mockResolvedValue({ rows: [], totalCount: 0 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=hello&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(browsePoemsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoemsMock).not.toHaveBeenCalled();
  });

  it('poets filter-only routes to browsePoetsByFilters', async () => {
    browsePoetsByFiltersMock.mockResolvedValue({ rows: [samplePoetRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(browsePoetsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoetsMock).not.toHaveBeenCalled();
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poets');
    expect(body.data[0]?.type).toBe('poet');
  });

  it('poets text query routes to searchPoets', async () => {
    searchPoetsMock.mockResolvedValue({ rows: [samplePoetRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    expect(searchPoetsMock).toHaveBeenCalledTimes(1);
    expect(browsePoetsByFiltersMock).not.toHaveBeenCalled();
  });
});
