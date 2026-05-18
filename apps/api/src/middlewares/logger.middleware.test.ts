import { API_V1_PREFIX } from '@qafiyah/constants';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_OPENAPI_DOCS_PATH, API_OPENAPI_SPEC_PATH } from '@/constants';
import { enrichContext } from '@/lib/logger';
import type { AppContext } from '@/types';
import { loggerMiddleware } from './logger.middleware';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function buildAppWithMiddleware(
  env: Partial<AppContext['Bindings']> = { ENVIRONMENT: 'development' }
) {
  const app = new Hono<AppContext>();
  app.use(loggerMiddleware);
  app.get('/v1/poets', (c) => {
    enrichContext(c, { poet_id: 'p1', result_count: 4 });
    return c.json({ ok: true });
  });
  app.get(`${API_V1_PREFIX}${API_OPENAPI_SPEC_PATH}`, (c) => c.json({ openapi: '3.1.0' }));
  app.get(`${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}`, (c) => c.text('docs'));
  app.get(`${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}/swagger`, (c) => c.text('docs-asset'));
  app.get('/v1/boom', () => {
    throw new Error('boom');
  });
  return { app, env };
}

async function fetchPath(
  appCtx: ReturnType<typeof buildAppWithMiddleware>,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return await appCtx.app.fetch(new Request(`http://localhost${path}`, init), appCtx.env);
}

describe('loggerMiddleware', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a structured completed log for a normal request', async () => {
    const ctx = buildAppWithMiddleware();
    const res = await fetchPath(ctx, '/v1/poets');

    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      kind: 'completed',
      method: 'GET',
      path: '/v1/poets',
      status_code: 200,
      service: { name: 'qafiyah-api', environment: 'development' },
      poet_id: 'p1',
      result_count: 4,
    });
    expect(typeof payload.request_id).toBe('string');
    expect(payload.request_id).toMatch(UUID_RE);
    expect(typeof payload.duration_ms).toBe('number');
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);
    expect(typeof payload.timestamp).toBe('string');
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('falls back to "unknown" environment when ENVIRONMENT binding is absent', async () => {
    const ctx = buildAppWithMiddleware({});
    await fetchPath(ctx, '/v1/poets');

    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.service.environment).toBe('unknown');
  });

  it('does not emit for the OpenAPI spec path', async () => {
    const ctx = buildAppWithMiddleware();
    const res = await fetchPath(ctx, `${API_V1_PREFIX}${API_OPENAPI_SPEC_PATH}`);
    expect(res.status).toBe(200);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does not emit for the OpenAPI docs path or its sub-paths', async () => {
    const ctx = buildAppWithMiddleware();
    await fetchPath(ctx, `${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}`);
    await fetchPath(ctx, `${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}/swagger`);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('assigns a unique request_id per request', async () => {
    const ctx = buildAppWithMiddleware();
    await fetchPath(ctx, '/v1/poets');
    await fetchPath(ctx, '/v1/poets');

    const first = JSON.parse(logSpy.mock.calls[0][0] as string);
    const second = JSON.parse(logSpy.mock.calls[1][0] as string);
    expect(first.request_id).not.toBe(second.request_id);
  });

  it('suppresses ordinary requests in production via sampling', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const ctx = buildAppWithMiddleware({ ENVIRONMENT: 'production' });

    const res = await fetchPath(ctx, '/v1/poets');
    expect(res.status).toBe(200);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('emits empty-result responses in production regardless of sampling', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const app = new Hono<AppContext>();
    app.use(loggerMiddleware);
    app.get('/v1/poets', (c) => {
      enrichContext(c, { result_count: 0 });
      return c.json({ data: [] });
    });

    const res = await app.fetch(new Request('http://localhost/v1/poets'), {
      ENVIRONMENT: 'production',
    });
    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.result_count).toBe(0);
    expect(payload.service.environment).toBe('production');
  });

  it('records the response status_code set by the handler', async () => {
    const app = new Hono<AppContext>();
    app.use(loggerMiddleware);
    app.get('/v1/missing', (c) => c.json({ error: 'nope' }, 404));

    await app.fetch(new Request('http://localhost/v1/missing'), { ENVIRONMENT: 'development' });

    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.status_code).toBe(404);
    expect(payload.kind).toBe('completed');
  });
});
