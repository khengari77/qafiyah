import { ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bindings } from './env';

const { listErasMock, createDbMock, getRandomPoemMock } = vi.hoisted(() => ({
  listErasMock: vi.fn(),
  createDbMock: vi.fn(),
  getRandomPoemMock: vi.fn(),
}));

vi.mock('@qafiyah/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@qafiyah/db')>();
  return {
    ...actual,
    createDb: createDbMock,
    erasQueries: { ...actual.erasQueries, listEras: listErasMock },
    poemsQueries: { ...actual.poemsQueries, getRandomPoem: getRandomPoemMock },
  };
});

const TEST_ENV: Bindings = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ENVIRONMENT: 'test',
};
const READ_CC = 'public, max-age=300, stale-while-revalidate=86400';
const WEAK_ETAG_REGEX = /^W\/"[0-9a-f]{16}"$/;
const sampleEra = { name: 'عباسي', slug: 'abbasid', poemsCount: 100, poetsCount: 50 };

describe('app /v1 read caching + HEAD', () => {
  beforeEach(() => {
    createDbMock.mockReturnValue(ok({}));
    listErasMock.mockResolvedValue(ok([sampleEra]));
    getRandomPoemMock.mockResolvedValue(ok({ slug: 'abcd' }));
  });
  afterEach(() => vi.clearAllMocks());

  it('GET /v1/eras carries a weak ETag + Cache-Control and 304s on If-None-Match', async () => {
    const { default: app } = await import('./app');
    const first = await app.fetch(new Request('http://x/v1/eras'), TEST_ENV);
    expect(first.status).toBe(200);
    expect(first.headers.get('Cache-Control')).toBe(READ_CC);
    const etag = first.headers.get('ETag');
    expect(etag).toMatch(WEAK_ETAG_REGEX);
    const second = await app.fetch(
      new Request('http://x/v1/eras', { headers: { 'If-None-Match': etag as string } }),
      TEST_ENV
    );
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });

  it('HEAD /v1/eras returns 200 with cache headers and no body', async () => {
    const { default: app } = await import('./app');
    const res = await app.fetch(new Request('http://x/v1/eras', { method: 'HEAD' }), TEST_ENV);
    expect(res.status).toBe(200);
    expect(res.headers.get('ETag')).toMatch(WEAK_ETAG_REGEX);
    expect(res.headers.get('Cache-Control')).toBe(READ_CC);
    expect(await res.text()).toBe('');
  });

  it('never caches /v1/poems/random (no-store, no ETag)', async () => {
    const { default: app } = await import('./app');
    const res = await app.fetch(new Request('http://x/v1/poems/random?option=slug'), TEST_ENV);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('ETag')).toBeNull();
  });

  it('documents error responses with the RFC 9457 Problem body shape', async () => {
    type SpecDoc = {
      paths: Record<
        string,
        Record<
          string,
          {
            responses?: Record<
              string,
              { content?: Record<string, { schema?: { properties?: Record<string, unknown> } }> }
            >;
          }
        >
      >;
    };
    const { default: app } = await import('./app');
    const spec = (await (
      await app.fetch(new Request('http://x/v1/openapi.json'), TEST_ENV)
    ).json()) as SpecDoc;
    const schema =
      spec.paths['/poems/{slug}']?.['get']?.responses?.['404']?.content?.['application/json']
        ?.schema;
    expect(schema?.properties?.['type']).toBeDefined();
    expect(schema?.properties?.['title']).toBeDefined();
    expect(schema?.properties?.['code']).toBeDefined();
    expect(schema?.properties?.['detail']).toBeDefined();
  });
});
