/**
 * Integration tests for filter-only search against the local Postgres dump.
 * Skipped unless TEST_DATABASE_URL is provided (e.g. `bun run db:setup` then export).
 *
 * Verifies:
 * - listPoemsByFilters resolves slugs OR id-strings to filter ids.
 * - Filtered queries narrow results.
 * - listPoetsByFilters works era-only.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbClient } from '../client';
import { listPoemsByFilters, listPoetsByFilters } from './search.queries';

const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? '';
const skip = TEST_DATABASE_URL === '';
const describeIfDb = skip ? describe.skip : describe;

describeIfDb('filter-only search queries (integration)', () => {
  let db: DbClient;

  beforeAll(() => {
    db = createDb(TEST_DATABASE_URL);
  });

  afterAll(async () => {
    // postgres-js holds open sockets; let GC clear them after this run.
  });

  it('listPoemsByFilters: by era slug returns rows + non-zero total', async () => {
    const result = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(5);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poemTitle).toBeTypeOf('string');
      expect(row.poemSlug).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('listPoemsByFilters: numeric ID-string is also accepted as a slug', async () => {
    const bySlug = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const byId = await listPoemsByFilters(db, 1, null, ['2'], null, null);
    expect(byId.totalCount).toBe(bySlug.totalCount);
  });

  it('listPoemsByFilters: combining filters narrows results', async () => {
    const eraOnly = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const eraAndMeter = await listPoemsByFilters(db, 1, ['alkamil'], ['abbasid'], null, null);
    expect(eraAndMeter.totalCount).toBeLessThanOrEqual(eraOnly.totalCount);
  });

  it('listPoemsByFilters: unknown filter yields zero results', async () => {
    const result = await listPoemsByFilters(db, 1, null, ['__nonexistent__'], null, null);
    expect(result.totalCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('listPoetsByFilters: by era slug returns rows', async () => {
    const result = await listPoetsByFilters(db, 1, ['abbasid']);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(10);
    for (const row of result.rows) {
      expect(row.poetEra).toBe('عباسي');
      expect(row.poetSlug).toBeTypeOf('string');
    }
  });

  it('listPoetsByFilters: no filter returns all poets', async () => {
    const all = await listPoetsByFilters(db, 1, null);
    const filtered = await listPoetsByFilters(db, 1, ['abbasid']);
    expect(all.totalCount).toBeGreaterThanOrEqual(filtered.totalCount);
  });

  it('listPoemsByFilters: pagination', async () => {
    const page1 = await listPoemsByFilters(db, 1, null, ['abbasid'], null, null);
    const page2 = await listPoemsByFilters(db, 2, null, ['abbasid'], null, null);
    if (page1.totalCount > 5) {
      expect(page2.rows.length).toBeGreaterThan(0);
      const page1Slugs = new Set(page1.rows.map((r) => r.poemSlug));
      for (const row of page2.rows) {
        expect(page1Slugs.has(row.poemSlug)).toBe(false);
      }
    }
  });
});
