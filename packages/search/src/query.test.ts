import { describe, expect, it } from 'vitest';
import { buildPoemSearchBody, buildPoetSearchBody } from './query';

describe('buildPoemSearchBody', () => {
  it('puts term filters under bool.filter (cacheable), not scoring', () => {
    const body = buildPoemSearchBody({
      q: 'حب',
      matchType: 'all',
      page: 1,
      poetSlugs: [],
      eraSlugs: ['abbasid'],
      meterSlugs: ['tawil'],
      themeSlugs: [],
      rhymeSlugs: [],
    });
    expect(body.query.bool.filter).toEqual(
      expect.arrayContaining([
        { terms: { eraSlug: ['abbasid'] } },
        { terms: { meterSlug: ['tawil'] } },
      ])
    );
    expect(JSON.stringify(body.query.bool.filter)).not.toContain('"match"');
  });
  it('uses match_phrase for exact matchType', () => {
    const body = buildPoemSearchBody({
      q: 'يا ليل',
      matchType: 'exact',
      page: 1,
      poetSlugs: [],
      eraSlugs: [],
      meterSlugs: [],
      themeSlugs: [],
      rhymeSlugs: [],
    });
    expect(JSON.stringify(body.query.bool.must)).toContain('match_phrase');
  });
  it('boosts exact > normalized > stemmed and highlights content', () => {
    const body = buildPoemSearchBody({
      q: 'حب',
      matchType: 'all',
      page: 1,
      poetSlugs: [],
      eraSlugs: [],
      meterSlugs: [],
      themeSlugs: [],
      rhymeSlugs: [],
    });
    const s = JSON.stringify(body.query.bool.must);
    expect(s).toContain('title.exact');
    expect(s).toContain('content.stemmed');
    expect(body.highlight.fields).toHaveProperty('content');
  });
  it('uses match_all + id sort when q is empty (browse)', () => {
    const body = buildPoemSearchBody({
      q: '',
      matchType: 'all',
      page: 2,
      poetSlugs: [],
      eraSlugs: ['abbasid'],
      meterSlugs: [],
      themeSlugs: [],
      rhymeSlugs: [],
    });
    expect(body.query.bool.must).toEqual([{ match_all: {} }]);
    expect(body.sort).toEqual([{ id: 'desc' }]);
    expect(body.from).toBe(5); // (2-1) * SEARCH_POEMS_PER_PAGE (=5)
  });
});

describe('buildPoetSearchBody', () => {
  it('filters poets by era only', () => {
    const body = buildPoetSearchBody({ q: '', matchType: 'all', page: 1, eraSlugs: ['islamic'] });
    expect(body.query.bool.filter).toEqual([{ terms: { eraSlug: ['islamic'] } }]);
  });
});
