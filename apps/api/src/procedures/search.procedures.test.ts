import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils/test-helpers';
import type { AppContext } from '@/types';

const searchPoemsMock = vi.fn();
const searchPoetsMock = vi.fn();
const listPoemsByFiltersMock = vi.fn();
const listPoetsByFiltersMock = vi.fn();

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    searchQueries: {
      searchPoems: searchPoemsMock,
      searchPoets: searchPoetsMock,
      listPoemsByFilters: listPoemsByFiltersMock,
      listPoetsByFilters: listPoetsByFiltersMock,
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

const samplePoemRow = {
  poetName: 'p',
  poetEra: 'e',
  poetSlug: 's',
  poemTitle: 't',
  poemSnippet: 'x',
  poemMeter: 'm',
  poemSlug: 's',
  relevance: 0,
};

const samplePoetRow = {
  poetName: 'p',
  poetEra: 'e',
  poetSlug: 's',
  poetBio: '',
  relevance: 0,
};

describe('search procedure', () => {
  beforeEach(() => {
    searchPoemsMock.mockReset();
    searchPoetsMock.mockReset();
    listPoemsByFiltersMock.mockReset();
    listPoetsByFiltersMock.mockReset();
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
    expect(listPoemsByFiltersMock).not.toHaveBeenCalled();
  });

  it('text-only Arabic query calls searchPoems, not the filter-only path', async () => {
    searchPoemsMock.mockResolvedValue({ rows: [samplePoemRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    expect(searchPoemsMock).toHaveBeenCalledTimes(1);
    expect(listPoemsByFiltersMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { total: number; results: unknown[] };
    expect(body.total).toBe(1);
    expect(body.results).toHaveLength(1);
  });

  it('filter-only call routes to listPoemsByFilters', async () => {
    listPoemsByFiltersMock.mockResolvedValue({ rows: [samplePoemRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(listPoemsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoemsMock).not.toHaveBeenCalled();
    const [, page, meterSlugs, eraSlugs] = listPoemsByFiltersMock.mock.calls[0] ?? [];
    expect(page).toBe(1);
    expect(meterSlugs).toBeNull();
    expect(eraSlugs).toEqual(['abbasid']);
  });

  it('non-Arabic text + filter sanitizes to empty and uses filter-only path', async () => {
    listPoemsByFiltersMock.mockResolvedValue({ rows: [], totalCount: 0 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=hello&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(listPoemsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoemsMock).not.toHaveBeenCalled();
  });

  it('poets filter-only routes to listPoetsByFilters', async () => {
    listPoetsByFiltersMock.mockResolvedValue({ rows: [samplePoetRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    expect(listPoetsByFiltersMock).toHaveBeenCalledTimes(1);
    expect(searchPoetsMock).not.toHaveBeenCalled();
  });

  it('poets text query routes to searchPoets', async () => {
    searchPoetsMock.mockResolvedValue({ rows: [samplePoetRow], totalCount: 1 });
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    expect(searchPoetsMock).toHaveBeenCalledTimes(1);
    expect(listPoetsByFiltersMock).not.toHaveBeenCalled();
  });
});
