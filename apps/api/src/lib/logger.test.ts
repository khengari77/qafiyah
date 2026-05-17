import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@/types';
import {
  createLogHandle,
  enrichContext,
  type LogHandle,
  recordError,
  recordResponse,
  shouldEmit,
  toLogEvent,
} from './logger';

function makeHandle(env = 'development'): LogHandle {
  return createLogHandle({
    request_id: 'req-1',
    method: 'GET',
    path: '/v1/poets',
    timestamp: '2026-05-16T00:00:00.000Z',
    service: { name: 'qafiyah-api', environment: env },
  });
}

describe('enrichContext', () => {
  it('mutates the handle on the request context', async () => {
    const app = new Hono<AppContext>();
    const handle = makeHandle();

    app.use(async (c, next) => {
      c.set('logEvent', handle);
      await next();
    });
    app.get('/test', (c) => {
      enrichContext(c, { poet_id: 'p1', results_count: 12 });
      return c.json({ ok: true });
    });

    await app.fetch(new Request('http://localhost/test'));

    const projected = toLogEvent(handle);
    // Without status_code/duration_ms set, projection returns null; mutate
    // those too to inspect the merged state.
    recordResponse(handle, 200, 1);
    const final = toLogEvent(handle);
    expect(final).toMatchObject({ poet_id: 'p1', results_count: 12 });
    expect(projected).toBeNull();
  });

  it('is a no-op when no logEvent is set', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', (c) => {
      expect(() => enrichContext(c, { poet_id: 'p1' })).not.toThrow();
      return c.json({ ok: true });
    });

    const res = await app.fetch(new Request('http://localhost/test'));
    expect(res.status).toBe(200);
  });

  it('overwrites prior fields on repeated enrichment', async () => {
    const handle = makeHandle();
    const app = new Hono<AppContext>();
    app.use(async (c, next) => {
      c.set('logEvent', handle);
      await next();
    });
    app.get('/test', (c) => {
      enrichContext(c, { results_count: 2 });
      enrichContext(c, { results_count: 7 });
      return c.json({ ok: true });
    });

    await app.fetch(new Request('http://localhost/test'));
    recordResponse(handle, 200, 1);
    expect(toLogEvent(handle)).toMatchObject({ results_count: 7 });
  });
});

describe('shouldEmit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always emits in non-production environments', () => {
    const handle = makeHandle('development');
    recordResponse(handle, 200, 5);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(true);
  });

  it('emits 5xx responses in production', () => {
    const handle = makeHandle('production');
    recordResponse(handle, 503, 10);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(true);
  });

  it('emits slow requests (>2000ms) in production', () => {
    const handle = makeHandle('production');
    recordResponse(handle, 200, 2001);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(true);
  });

  it('does not treat exactly 2000ms as slow', () => {
    const handle = makeHandle('production');
    recordResponse(handle, 200, 2000);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(false);
  });

  it('emits empty-result responses in production', async () => {
    const handle = makeHandle('production');
    recordResponse(handle, 200, 50);
    const app = new Hono<AppContext>();
    app.use(async (c, next) => {
      c.set('logEvent', handle);
      await next();
    });
    app.get('/x', (c) => {
      enrichContext(c, { results_count: 0 });
      return c.json({});
    });
    await app.fetch(new Request('http://localhost/x'));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(true);
  });

  it('samples at 5% in production for ordinary responses', async () => {
    const handle = makeHandle('production');
    recordResponse(handle, 200, 10);
    const app = new Hono<AppContext>();
    app.use(async (c, next) => {
      c.set('logEvent', handle);
      await next();
    });
    app.get('/x', (c) => {
      enrichContext(c, { results_count: 3 });
      return c.json({});
    });
    await app.fetch(new Request('http://localhost/x'));
    vi.spyOn(Math, 'random').mockReturnValue(0.049);
    expect(shouldEmit(handle)).toBe(true);

    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    expect(shouldEmit(handle)).toBe(false);

    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(shouldEmit(handle)).toBe(false);
  });

  it('defaults missing status_code/duration_ms to passing thresholds in production', () => {
    const handle = makeHandle('production');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(handle)).toBe(false);
  });
});

describe('toLogEvent', () => {
  it('returns null when neither status_code nor duration_ms is set', () => {
    const handle = makeHandle();
    expect(toLogEvent(handle)).toBeNull();
  });

  it('projects a completed event without error', async () => {
    const handle = makeHandle();
    recordResponse(handle, 200, 42);
    const app = new Hono<AppContext>();
    app.use(async (c, next) => {
      c.set('logEvent', handle);
      await next();
    });
    app.get('/x', (c) => {
      enrichContext(c, { poet_id: 'p1', results_count: 7 });
      return c.json({});
    });
    await app.fetch(new Request('http://localhost/x'));
    expect(toLogEvent(handle)).toEqual({
      request_id: 'req-1',
      method: 'GET',
      path: '/v1/poets',
      timestamp: '2026-05-16T00:00:00.000Z',
      service: { name: 'qafiyah-api', environment: 'development' },
      kind: 'completed',
      status_code: 200,
      duration_ms: 42,
      poet_id: 'p1',
      results_count: 7,
    });
  });

  it('projects a completed_error event when error is recorded', () => {
    const handle = makeHandle();
    recordResponse(handle, 500, 7);
    recordError(handle, {
      type: 'about:blank',
      code: 'INTERNAL',
      message: 'boom',
      retriable: false,
    });

    expect(toLogEvent(handle)).toEqual({
      request_id: 'req-1',
      method: 'GET',
      path: '/v1/poets',
      timestamp: '2026-05-16T00:00:00.000Z',
      service: { name: 'qafiyah-api', environment: 'development' },
      kind: 'completed_error',
      status_code: 500,
      duration_ms: 7,
      error: {
        type: 'about:blank',
        code: 'INTERNAL',
        message: 'boom',
        retriable: false,
      },
    });
  });
});
