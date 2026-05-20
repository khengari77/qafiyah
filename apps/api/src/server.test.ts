import { describe, expect, it } from 'vitest';
import type { Bindings } from './env';
import { createFetchHandler } from './server';

const TEST_ENV: Bindings = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ENVIRONMENT: 'test',
};

describe('createFetchHandler', () => {
  it('delegates to the Hono app (GET / redirects to docs)', async () => {
    const handler = createFetchHandler(TEST_ENV);
    const res = await handler(new Request('http://localhost/'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/v1/docs');
  });

  it('injects the provided env as c.env (favicon route responds)', async () => {
    const handler = createFetchHandler(TEST_ENV);
    const res = await handler(new Request('http://localhost/favicon.ico'));
    expect(res.status).toBe(200);
  });
});
