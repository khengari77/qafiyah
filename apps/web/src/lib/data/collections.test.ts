import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCollectionsMemoForTests,
  allEras,
  allMeters,
  allRhymes,
  allThemes,
  getEraPoemsPage,
  getMeterPoemsPage,
  getRhymePoemsPage,
  getThemePoemsPage,
} from './collections';
import { __resetLoaderCacheForTests, setSnapshotDirForTests } from './loader';

const ERAS_FIXTURE = [{ slug: 'jahili', name: 'الجاهلي', poetsCount: 12, poemsCount: 31 }];
const METERS_FIXTURE = [{ slug: 'albasit', name: 'البسيط', poemsCount: 31 }];
const RHYMES_FIXTURE = [{ slug: 'rhyme-1', name: 'باء', poemsCount: 31 }];
const THEMES_FIXTURE = [{ slug: 'theme-1', name: 'مدح', poemsCount: 31 }];

function makePoem(i: number) {
  return {
    title: `Poem ${i}`,
    slug: `poem-${i}`,
    poet: { name: 'Poet', slug: 'poet-x' },
    meter: { name: 'Meter', slug: 'meter-x' },
  };
}

const POEMS = Array.from({ length: 31 }, (_, i) => makePoem(i + 1));
const ERA_POEMS_FIXTURE = { jahili: POEMS };
const METER_POEMS_FIXTURE = { albasit: POEMS };
const RHYME_POEMS_FIXTURE = { 'rhyme-1': POEMS };
const THEME_POEMS_FIXTURE = { 'theme-1': POEMS };

describe('collections data accessor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'qafiyah-collections-'));
    writeFileSync(join(tempDir, 'eras.json'), JSON.stringify(ERAS_FIXTURE));
    writeFileSync(join(tempDir, 'meters.json'), JSON.stringify(METERS_FIXTURE));
    writeFileSync(join(tempDir, 'rhymes.json'), JSON.stringify(RHYMES_FIXTURE));
    writeFileSync(join(tempDir, 'themes.json'), JSON.stringify(THEMES_FIXTURE));
    writeFileSync(join(tempDir, 'era-poems.json'), JSON.stringify(ERA_POEMS_FIXTURE));
    writeFileSync(join(tempDir, 'meter-poems.json'), JSON.stringify(METER_POEMS_FIXTURE));
    writeFileSync(join(tempDir, 'rhyme-poems.json'), JSON.stringify(RHYME_POEMS_FIXTURE));
    writeFileSync(join(tempDir, 'theme-poems.json'), JSON.stringify(THEME_POEMS_FIXTURE));
    setSnapshotDirForTests(tempDir);
    __resetLoaderCacheForTests();
    __resetCollectionsMemoForTests();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    setSnapshotDirForTests(null);
    __resetLoaderCacheForTests();
    __resetCollectionsMemoForTests();
  });

  it('allEras returns all eras', () => {
    expect(allEras()).toHaveLength(1);
    expect(allEras()[0]?.poetsCount).toBe(12);
  });

  it('allMeters / allRhymes / allThemes return their lists', () => {
    expect(allMeters()).toHaveLength(1);
    expect(allRhymes()).toHaveLength(1);
    expect(allThemes()).toHaveLength(1);
  });

  it('getEraPoemsPage paginates correctly', () => {
    const result = getEraPoemsPage('jahili' as EraSlug, 2);
    expect(result.poems).toHaveLength(1);
    expect(result.poems[0]?.slug).toBe('poem-31');
    expect(result.era).toEqual({ slug: 'jahili', name: 'الجاهلي', poetsCount: 12, poemsCount: 31 });
    expect(result.pagination).toEqual({ totalItems: 31, totalPages: 2, page: 2, pageSize: 30 });
  });

  it('getMeterPoemsPage returns the page + meter meta', () => {
    const result = getMeterPoemsPage('albasit' as MeterSlug, 1);
    expect(result.poems).toHaveLength(30);
    expect(result.meter.slug).toBe('albasit');
  });

  it('getRhymePoemsPage returns the page + rhyme meta', () => {
    const result = getRhymePoemsPage('rhyme-1' as RhymeSlug, 1);
    expect(result.rhyme.slug).toBe('rhyme-1');
  });

  it('getThemePoemsPage returns the page + theme meta', () => {
    const result = getThemePoemsPage('theme-1' as ThemeSlug, 1);
    expect(result.theme.slug).toBe('theme-1');
  });

  it('throws on unknown era slug', () => {
    expect(() => getEraPoemsPage('missing' as EraSlug, 1)).toThrow("era 'missing'");
  });

  it('throws on out-of-range page', () => {
    expect(() => getMeterPoemsPage('albasit' as MeterSlug, 99)).toThrow('page 99 out of range');
  });
});
