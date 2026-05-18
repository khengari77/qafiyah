import { Hono } from 'hono';
import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@/types';

const { createMockDbFactory } = vi.hoisted(() => ({ createMockDbFactory: vi.fn() }));
vi.mock('@qafiyah/db', async () => {
  const actual = await vi.importActual<typeof import('@qafiyah/db')>('@qafiyah/db');
  return {
    ...actual,
    createDb: createMockDbFactory,
  };
});

async function reimportMiddleware() {
  vi.resetModules();
  const mod = await import('./db.middleware');
  return mod.dbMiddleware;
}

function buildAppWithMiddleware(middleware: Awaited<ReturnType<typeof reimportMiddleware>>) {
  const app = new Hono<AppContext>();
  app.use(middleware);
  app.get('/test', (c) => c.json({ hasDb: !!c.get('db') }));
  return app;
}

describe('dbMiddleware', () => {
  beforeEach(() => {
    createMockDbFactory.mockReset();
    createMockDbFactory.mockReturnValue(ok({ __mock: 'db' }));
  });

  it('returns 500 when DATABASE_URL is missing (configuration error)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = buildAppWithMiddleware(await reimportMiddleware());
    const res = await app.fetch(new Request('http://localhost/test'), {});
    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
  });

  it('returns 500 when DATABASE_URL is malformed (configuration error)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = buildAppWithMiddleware(await reimportMiddleware());
    const res = await app.fetch(new Request('http://localhost/test'), {
      DATABASE_URL: 'not-a-url',
    });
    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
  });

  it('creates a fresh db client per request for a localhost URL', async () => {
    const app = buildAppWithMiddleware(await reimportMiddleware());
    const env = { DATABASE_URL: 'postgresql://u:p@127.0.0.1:5433/d' };

    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);

    expect(createMockDbFactory).toHaveBeenCalledTimes(3);
  });

  it('creates a fresh db client per request for a remote URL', async () => {
    const app = buildAppWithMiddleware(await reimportMiddleware());
    const env = { DATABASE_URL: 'postgresql://u:p@db.example.com:5432/d' };

    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);

    expect(createMockDbFactory).toHaveBeenCalledTimes(2);
  });
});
