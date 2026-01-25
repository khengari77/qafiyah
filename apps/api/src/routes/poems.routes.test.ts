/**
 * Tests for poems routes
 */

import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_RANDOM_POEM_LINES, FALLBACK_RANDOM_POEM_SLUG } from '../constants';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
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

  it('should return poem by slug', async () => {
    const mockPoemData = {
      poem: {
        slug: 'eabca780-811f-4ea4-949e-21df6efba15d',
        title: 'Test Poem',
        content: 'Poem content',
        poet_name: 'Test Poet',
        poet_slug: 'test-poet',
        meter_name: 'Test Meter',
        theme_name: 'Test Theme',
        era_name: 'Test Era',
        era_slug: 'test-era',
      },
      related_poems: [
        {
          poem_slug: 'related-1',
          poet_name: 'Related Poet',
          meter_name: 'Meter',
          poem_title: 'Related Poem',
        },
      ],
    };

    const mockResult = [
      {
        get_poem_with_related: mockPoemData,
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResult);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/slug/eabca780-811f-4ea4-949e-21df6efba15d');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).metadata).toBeDefined();
    expect((json.data as Record<string, unknown>).clearTitle).toBeDefined();
    expect((json.data as Record<string, unknown>).processedContent).toBeDefined();
  });

  it('should return 404 when poem not found', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([]);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/slug/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return 400 when poem data has error', async () => {
    const mockError = {
      error: 'Invalid poem',
      message: 'Poem data is invalid',
    };

    const mockResult = [
      {
        get_poem_with_related: mockError,
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResult);

    const client = createTestClient(poems, { db });

    const res = await client.$get('/slug/eabca780-811f-4ea4-949e-21df6efba15d');

    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });
});
