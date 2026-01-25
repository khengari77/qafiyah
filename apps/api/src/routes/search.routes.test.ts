/**
 * Tests for search routes
 */

import { describe, expect, it, vi } from 'vitest';
import { type ApiResponse, createMockDb, createTestClient } from '../test-utils/test-helpers';
import search from './search.routes';

describe('search routes', () => {
  it('should return search results for poems', async () => {
    const mockResults = [
      {
        poet_name: 'Test Poet',
        poet_era: 'Test Era',
        poet_slug: 'test-poet',
        poem_title: 'Test Poem',
        poem_snippet: 'Poem snippet',
        poem_meter: 'Test Meter',
        poem_slug: 'test-poem',
        relevance: 0.95,
        total_count: 10,
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResults);

    const client = createTestClient(search, { db });

    const res = await client.$get('/?q=شعر&search_type=poems&page=1&match_type=exact');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).results).toBeDefined();
    expect((json.data as Record<string, unknown>).pagination).toBeDefined();
  });

  it('should return search results for poets', async () => {
    const mockResults = [
      {
        poet_name: 'Test Poet',
        poet_era: 'Test Era',
        poet_slug: 'test-poet',
        poet_bio: 'Test bio',
        relevance: 0.9,
        total_count: 5,
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResults);

    const client = createTestClient(search, { db });

    const res = await client.$get('/?q=شاعر&search_type=poets&page=1&match_type=exact');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).results).toBeDefined();
  });

  it('should return empty results when no matches found', async () => {
    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue([]);

    const client = createTestClient(search, { db });

    const res = await client.$get('/?q=غيرموجود&search_type=poems&page=1&match_type=exact');

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
    expect((json.data as Record<string, unknown>).results).toEqual([]);
    expect(
      ((json.data as Record<string, unknown>).pagination as { totalResults: number }).totalResults
    ).toBe(0);
  });

  it('should return 400 for invalid search type', async () => {
    const db = createMockDb();
    const client = createTestClient(search, { db });

    const res = await client.$get('/?q=test&search_type=invalid&page=1&match_type=exact');

    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should return 400 for empty query', async () => {
    const db = createMockDb();
    const client = createTestClient(search, { db });

    const res = await client.$get('/?q=&search_type=poems&page=1&match_type=exact');

    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(false);
  });

  it('should handle filter parameters', async () => {
    const mockResults = [
      {
        poet_name: 'Test Poet',
        poet_era: 'Test Era',
        poet_slug: 'test-poet',
        poem_title: 'Test Poem',
        poem_snippet: 'Poem snippet',
        poem_meter: 'Test Meter',
        poem_slug: 'test-poem',
        relevance: 0.95,
        total_count: 5,
      },
    ];

    const db = createMockDb();
    db.execute = vi.fn().mockResolvedValue(mockResults);

    const client = createTestClient(search, { db });

    const res = await client.$get(
      '/?q=شعر&search_type=poems&page=1&match_type=exact&meter_ids=1,2&era_ids=3&theme_ids=4&rhyme_ids=5'
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as ApiResponse;
    expect(json.success).toBe(true);
  });
});
