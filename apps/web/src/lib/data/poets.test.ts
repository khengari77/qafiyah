import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PoetSlug } from '@qafiyah/contracts';
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader';
import {
  __resetPoetsMemoForTests,
  allPoets,
  getPoetPoemsPage,
  getPoetsPage,
} from './poets';

const POETS_FIXTURE = [
  { slug: 'poet-a', name: 'Poet A', poemsCount: 65 },
  { slug: 'poet-b', name: 'Poet B', poemsCount: 1 },
];

function makePoemListItem(i: number) {
  return {
    title: `Poem ${i}`,
    slug: `poem-${i}`,
    poet: { name: 'Poet A', slug: 'poet-a' },
    meter: { name: 'Meter X', slug: 'meter-x' },
  };
}

const POET_POEMS_FIXTURE = {
  'poet-a': Array.from({ length: 65 }, (_, i) => makePoemListItem(i + 1)),
  'poet-b': [makePoemListItem(99)],
};

describe('poets data accessor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-poets-'));
    writeFileSync(join(tempDir, 'poets.json'), JSON.stringify(POETS_FIXTURE));
    writeFileSync(join(tempDir, 'poet-poems.json'), JSON.stringify(POET_POEMS_FIXTURE));
    setSnapshotDirForTests(tempDir);
    __resetLoaderCacheForTests();
    __resetPoetsMemoForTests();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    setSnapshotDirForTests(null);
    __resetLoaderCacheForTests();
    __resetPoetsMemoForTests();
  });

  it('allPoets returns all poets', () => {
    expect(allPoets()).toHaveLength(2);
  });

  it('getPoetsPage slices and returns pagination metadata', () => {
    const result = getPoetsPage(1);
    expect(result.poets).toHaveLength(2);
    expect(result.pagination).toEqual({ totalItems: 2, totalPages: 1, page: 1, pageSize: 30 });
  });

  it('getPoetsPage throws on out-of-range page', () => {
    expect(() => getPoetsPage(99)).toThrow(/poets page 99 out of range/i);
  });

  it('getPoetPoemsPage returns the page slice + meta', () => {
    const result = getPoetPoemsPage('poet-a' as PoetSlug, 2);
    expect(result.poems).toHaveLength(30);
    expect(result.poems[0]?.slug).toBe('poem-31');
    expect(result.poet).toEqual({ slug: 'poet-a', name: 'Poet A', poemsCount: 65 });
    expect(result.pagination).toEqual({ totalItems: 65, totalPages: 3, page: 2, pageSize: 30 });
  });

  it('getPoetPoemsPage throws on unknown poet', () => {
    expect(() => getPoetPoemsPage('missing' as PoetSlug, 1)).toThrow(/poet 'missing'/i);
  });

  it('getPoetPoemsPage throws on out-of-range page for a known poet', () => {
    expect(() => getPoetPoemsPage('poet-b' as PoetSlug, 5)).toThrow(/page 5 out of range/i);
  });
});
