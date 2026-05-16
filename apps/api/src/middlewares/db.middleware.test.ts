import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@/types';

const { createDbMock } = vi.hoisted(() => ({ createDbMock: vi.fn() }));
vi.mock('@qafiyah/db', async () => {
  const actual = await vi.importActual<typeof import('@qafiyah/db')>('@qafiyah/db');
  return {
    ...actual,
    createDb: createDbMock,
  };
});

async function freshMiddleware() {
  vi.resetModules();
  const mod = await import('./db.middleware');
  return mod.dbMiddleware;
}

function appWith(middleware: Awaited<ReturnType<typeof freshMiddleware>>) {
  const app = new Hono<AppContext>();
  app.use(middleware);
  app.get('/test', (c) => c.json({ hasDb: !!c.get('db') }));
  return app;
}

describe('dbMiddleware', () => {
  beforeEach(() => {
    createDbMock.mockReset();
    createDbMock.mockReturnValue({ __mock: 'db' });
  });

  it('returns 503 when DATABASE_URL is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appWith(await freshMiddleware());
    const res = await app.fetch(new Request('http://localhost/test'), {});
    consoleSpy.mockRestore();
    expect(res.status).toBe(503);
  });

  it('returns 503 when DATABASE_URL is malformed', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = appWith(await freshMiddleware());
    const res = await app.fetch(new Request('http://localhost/test'), {
      DATABASE_URL: 'not-a-url',
    });
    consoleSpy.mockRestore();
    expect(res.status).toBe(503);
  });

  it('creates a fresh db client per request for a localhost URL', async () => {
    const app = appWith(await freshMiddleware());
    const env = { DATABASE_URL: 'postgresql://u:p@127.0.0.1:5433/d' };

    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);

    expect(createDbMock).toHaveBeenCalledTimes(3);
    expect(createDbMock).toHaveBeenCalledWith(env.DATABASE_URL);
  });

  it('creates a fresh db client per request for a remote URL', async () => {
    const app = appWith(await freshMiddleware());
    const env = { DATABASE_URL: 'postgresql://u:p@db.example.com:5432/d' };

    await app.fetch(new Request('http://localhost/test'), env);
    await app.fetch(new Request('http://localhost/test'), env);

    expect(createDbMock).toHaveBeenCalledTimes(2);
    expect(createDbMock).toHaveBeenCalledWith(env.DATABASE_URL);
  });
});
