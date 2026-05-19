import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PoemSlug } from '@qafiyah/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader';
import { __resetPoemsMemoForTests, allPoemSlugs, allPoems, getPoem } from './poems';

const poemNotFoundPattern = /poem 'missing' not found in snapshot/i;

const FIXTURE: Record<string, unknown> = {
  'poem-a': {
    title: 'Poem A',
    slug: 'poem-a',
    verses: [['line 1a', 'line 1b']],
    verseCount: 1,
    sample: 'sample',
    keywords: 'k1,k2',
    poet: { name: 'Poet 1', slug: 'poet-1' },
    era: { name: 'Era 1', slug: 'era-1' },
    meter: { name: 'Meter 1', slug: 'meter-1' },
    theme: { name: 'Theme 1', slug: 'theme-1' },
    relatedPoems: [],
  },
};

describe('poems data accessor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-poems-'));
    writeFileSync(join(tempDir, 'poems.json'), JSON.stringify(FIXTURE));
    setSnapshotDirForTests(tempDir);
    __resetLoaderCacheForTests();
    __resetPoemsMemoForTests();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    setSnapshotDirForTests(null);
    __resetLoaderCacheForTests();
    __resetPoemsMemoForTests();
  });

  it('allPoems returns a Map with one entry per poem', () => {
    const map = allPoems();
    expect(map.size).toBe(1);
    const entry = map.get('poem-a' as PoemSlug);
    expect(entry?.title).toBe('Poem A');
  });

  it('getPoem returns the poem for a known slug', () => {
    const poem = getPoem('poem-a' as PoemSlug);
    expect(poem.poet.name).toBe('Poet 1');
  });

  it('getPoem throws a clear error for an unknown slug', () => {
    expect(() => getPoem('missing' as PoemSlug)).toThrow(poemNotFoundPattern);
  });

  it('allPoemSlugs returns the slugs', () => {
    expect(allPoemSlugs()).toEqual(['poem-a']);
  });
});
