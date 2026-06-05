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
    const mockPoem = { poem_id: 1, poet_name: 'شاعر', content: 'Line 1*Line 2', slug: 'abcd' };
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([{ random_poem_json: mockPoem }]);

    const client = createTestClient(poems, { db });
    const res = await client.$get('/random');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abcd');
  });

  it('should return random poem slug', async () => {
    const mockPoem = { poem_id: 1, poet_name: 'شاعر', content: 'Line 1*Line 2', slug: 'efgh' };
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([{ random_poem_json: mockPoem }]);

    const client = createTestClient(poems, { db });
    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('efgh');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('ETag')).toBeNull();
  });

  it('should fail with 500 when database returns no eligible poem for slug', async () => {
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
      slug: 'abcd',
    };

    const mockResult = [
      {
        random_poem_json: JSON.stringify(mockPoem),
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

  it('returns 500 problem+json when db rejection is an HTTPException (now caught as query_failed)', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockRejectedValue(new HTTPException(404, { message: 'not found' }));

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(500);
    expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
