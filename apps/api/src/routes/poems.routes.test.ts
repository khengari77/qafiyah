/**
 * Tests for the /poems/random plain-Hono route.
 * All other poems endpoints (slugs, slug/:slug) are exposed via oRPC procedures
 * in apps/api/src/procedures/poems.procedures.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_RANDOM_POEM_LINES, FALLBACK_RANDOM_POEM_SLUG } from '../db';
import { createMockDb, createTestClient } from '../test-utils/test-helpers';
import poems from './poems.routes';

describe('poems routes', () => {
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

  it('should return fallback slug when database returns no result', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([{}]);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=slug');

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(FALLBACK_RANDOM_POEM_SLUG);
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

  it('should return fallback lines when database error occurs', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockRejectedValue(new Error('Database error'));

    const client = createTestClient(poems, { db });

    const res = await client.$get('/random?option=lines');

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(FALLBACK_RANDOM_POEM_LINES);
  });
});
