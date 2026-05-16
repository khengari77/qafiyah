import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@/types';
import { enrichContext, type LogEventBuilder, shouldEmit, toLogEvent } from './logger';

function makeBuilder(overrides: Partial<LogEventBuilder> = {}): LogEventBuilder {
  return {
    request_id: 'req-1',
    method: 'GET',
    path: '/v1/poets',
    timestamp: '2026-05-16T00:00:00.000Z',
    service: { name: 'qafiyah-api', environment: 'development' },
    ...overrides,
  };
}

describe('enrichContext', () => {
  it('mutates the builder on the request context', async () => {
    const app = new Hono<AppContext>();
    const event: LogEventBuilder = makeBuilder();

    app.use(async (c, next) => {
      c.set('logEvent', event);
      await next();
    });
    app.get('/test', (c) => {
      enrichContext(c, { poet_id: 'p1', results_count: 12 });
      return c.json({ ok: true });
    });

    await app.fetch(new Request('http://localhost/test'));

    expect(event.poet_id).toBe('p1');
    expect(event.results_count).toBe(12);
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
    const event = makeBuilder({ results_count: 1 });
    const app = new Hono<AppContext>();
    app.use(async (c, next) => {
      c.set('logEvent', event);
      await next();
    });
    app.get('/test', (c) => {
      enrichContext(c, { results_count: 2 });
      enrichContext(c, { results_count: 7 });
      return c.json({ ok: true });
    });

    await app.fetch(new Request('http://localhost/test'));
    expect(event.results_count).toBe(7);
  });
});

describe('shouldEmit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always emits in non-production environments', () => {
    const event = makeBuilder({ status_code: 200, duration_ms: 5 });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(true);
  });

  it('emits 5xx responses in production', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
      status_code: 503,
      duration_ms: 10,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(true);
  });

  it('emits slow requests (>2000ms) in production', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
      status_code: 200,
      duration_ms: 2001,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(true);
  });

  it('does not treat exactly 2000ms as slow', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
      status_code: 200,
      duration_ms: 2000,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(false);
  });

  it('emits empty-result responses in production', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
      status_code: 200,
      duration_ms: 50,
      results_count: 0,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(true);
  });

  it('samples at 5% in production for ordinary responses', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
      status_code: 200,
      duration_ms: 10,
      results_count: 3,
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.049);
    expect(shouldEmit(event)).toBe(true);

    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    expect(shouldEmit(event)).toBe(false);

    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(shouldEmit(event)).toBe(false);
  });

  it('defaults missing status_code/duration_ms to passing thresholds in production', () => {
    const event = makeBuilder({
      service: { name: 'qafiyah-api', environment: 'production' },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldEmit(event)).toBe(false);
  });
});

describe('toLogEvent', () => {
  it('returns null when status_code is missing', () => {
    const event = makeBuilder({ duration_ms: 5 });
    expect(toLogEvent(event)).toBeNull();
  });

  it('returns null when duration_ms is missing', () => {
    const event = makeBuilder({ status_code: 200 });
    expect(toLogEvent(event)).toBeNull();
  });

  it('projects a completed event without error', () => {
    const event = makeBuilder({
      status_code: 200,
      duration_ms: 42,
      poet_id: 'p1',
      results_count: 7,
    });

    const projected = toLogEvent(event);

    expect(projected).toEqual({
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

  it('projects a completed_error event when error is present', () => {
    const event = makeBuilder({
      status_code: 500,
      duration_ms: 7,
      error: {
        type: 'about:blank',
        code: 'INTERNAL',
        message: 'boom',
        retriable: false,
      },
    });

    const projected = toLogEvent(event);

    expect(projected).toEqual({
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
