import { Hono } from 'hono';
import { okAsync } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { groupedSearchBodySchema } from '@/test-schemas';
import { createMockDb, createTestClient, parseJson } from '@/test-utils';
import type { AppContext } from '@/types';

const searchPoemsMock = vi.fn();
const searchPoetsMock = vi.fn();

vi.mock('@qafiyah/search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/search')>();
  return { ...actual, searchPoems: searchPoemsMock, searchPoets: searchPoetsMock };
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

const poemHit = {
  type: 'poem',
  title: 't',
  slug: '00000000-0000-0000-0000-000000000000',
  snippet: '<mark>x</mark>',
  poet: { name: 'p', slug: 'ps' },
  meter: { name: 'm', slug: 'ms' },
  era: { name: 'e', slug: 'abbasid' },
  relevance: 1.2,
};
const poetHit = {
  type: 'poet',
  name: 'n',
  slug: 'ns',
  bio: 'b',
  era: { name: 'e', slug: 'abbasid' },
  relevance: 0.9,
};

describe('grouped search procedure', () => {
  beforeEach(() => {
    searchPoemsMock.mockReset();
    searchPoetsMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('returns both sections in parallel by default', async () => {
    searchPoemsMock.mockReturnValue(okAsync({ hits: [poemHit], total: 1 }));
    searchPoetsMock.mockReturnValue(okAsync({ hits: [poetHit], total: 3 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?q=%D8%AD%D8%A8');
    expect(res.status).toBe(200);
    const body = await parseJson(res, groupedSearchBodySchema);
    expect(body.poems?.data[0]?.type).toBe('poem');
    expect(body.poems?.pagination.totalItems).toBe(1);
    expect(body.poets?.data[0]?.type).toBe('poet');
    expect(body.poets?.pagination.totalItems).toBe(3);
  });

  it('omits the poets section when types=poems only', async () => {
    searchPoemsMock.mockReturnValue(okAsync({ hits: [], total: 0 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?q=%D8%AD%D8%A8&types%5B0%5D=poems');
    expect(res.status).toBe(200);
    const body = await parseJson(res, groupedSearchBodySchema);
    expect(body.poets).toBeNull();
    expect(searchPoetsMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the poems search errors', async () => {
    const { errAsync } = await import('neverthrow');
    searchPoemsMock.mockReturnValue(errAsync({ kind: 'es_error', message: 'boom' }));
    searchPoetsMock.mockReturnValue(okAsync({ hits: [], total: 0 }));
    const app = await buildOrpcApp();
    const client = createTestClient(app, { db: createMockDb() });
    const res = await client.$get('/v1/search?q=%D8%AD%D8%A8');
    expect(res.status).toBe(500);
  });
});
