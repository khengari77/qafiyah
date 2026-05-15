/**
 * Tests for the /poems/random plain-Hono route.
 * All other poems endpoints (slugs, slug/:slug) are exposed via oRPC procedures
 * in apps/api/src/procedures/poems.procedures.ts.
 */

import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, vi } from 'vitest';
import { createMockDb, createTestClient } from '@/test-utils';
import poems from './poems.routes';

describe('poems routes', () => {
  it('defaults to slug when no option query param is provided', async () => {
    const mockResult = [{ get_random_eligible_poem_slug: { slug: 'default-slug' } }];
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResult);

    const client = createTestClient(poems, { db });
    const res = await client.$get('/random');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('default-slug');
  });

  it('should return random poem slug', async () => {
    const mockResult = [
      {
        get_random_eligible_poem_slug: { slug: 'test-poem-slug' },
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResult);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('test-poem-slug');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should fail with 500 when database returns no slug', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([{}]);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(500);
  });

  it('should return random poem lines', async () => {
    const mockPoem = {
      poem_id: 1,
      poet_name: 'Test Poet',
      content: 'Line 1*Line 2*Line 3*Line 4',
    };

    const mockResult = [
      {
        get_random_eligible_poem: JSON.stringify(mockPoem),
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResult);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=lines');

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Line 1');
    expect(res.headers.get('Content-Type')?.toLowerCase()).toBe('text/plain; charset=utf-8');
  });

  it('should fail with 500 when database error occurs', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockRejectedValue(new Error('Database error'));

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=lines');

    expect(res.status).toBe(500);
  });

  it('returns problem+json when db throws a 404 HTTPException', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockRejectedValue(new HTTPException(404, { message: 'not found' }));

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns BAD_REQUEST problem when db throws a non-404 HTTPException', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockRejectedValue(new HTTPException(400, { message: 'bad input' }));

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('BAD_REQUEST');
  });
});
