import { Hono } from 'hono';
import { ok } from 'neverthrow';
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
  });

  it('returns matching poems for a text-only Arabic query', async () => {
    searchPoemsMock.mockResolvedValue(ok({ rows: [samplePoemRow], totalCount: 1 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poems');
    expect(body.pagination.totalItems).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.type).toBe('poem');
  });

  it('returns poems for a filter-only request', async () => {
    browsePoemsByFiltersMock.mockResolvedValue(ok({ rows: [samplePoemRow], totalCount: 1 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poems');
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.type).toBe('poem');
  });

  it('accepts non-Arabic text with a filter (treats q as empty)', async () => {
    browsePoemsByFiltersMock.mockResolvedValue(ok({ rows: [], totalCount: 0 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poems&q=hello&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    const body = await parseJson(res, searchBodySchema);
    expect(body.pagination.totalItems).toBe(0);
  });

  it('returns poets for a filter-only request', async () => {
    browsePoetsByFiltersMock.mockResolvedValue(ok({ rows: [samplePoetRow], totalCount: 1 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&eraSlugs%5B0%5D=abbasid');
    expect(res.status).toBe(200);
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poets');
    expect(body.data[0]?.type).toBe('poet');
  });

  it('returns matching poets for a text query', async () => {
    searchPoetsMock.mockResolvedValue(ok({ rows: [samplePoetRow], totalCount: 1 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?searchType=poets&q=%D9%82%D8%B5%D9%8A%D8%AF%D8%A9');
    expect(res.status).toBe(200);
    const body = await parseJson(res, searchBodySchema);
    expect(body.searchType).toBe('poets');
    expect(body.data[0]?.type).toBe('poet');
  });
});
