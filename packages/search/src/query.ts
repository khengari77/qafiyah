import type { MatchType } from '@qafiyah/constants';
import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';

type Filterable = Record<string, readonly string[]>;

function termFilters(map: Filterable): Array<{ terms: Record<string, readonly string[]> }> {
  return Object.entries(map)
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) => ({ terms: { [field]: values } }));
}

// Boosted text across exact (keyword) > normalized (text) > stemmed.
// matchType: 'exact' → phrase; 'all' → AND; 'any' → OR.
function textClauses(q: string, fields: readonly string[], matchType: MatchType) {
  const should: unknown[] = [];
  for (const field of fields) {
    if (matchType === 'exact') {
      should.push({ match_phrase: { [field]: { query: q, boost: 3 } } });
      should.push({ match_phrase: { [`${field}.stemmed`]: { query: q, boost: 1 } } });
    } else {
      const operator = matchType === 'all' ? 'and' : 'or';
      should.push({ term: { [`${field}.exact`]: { value: q, boost: 5 } } });
      should.push({ match: { [field]: { query: q, operator, boost: 3 } } });
      should.push({ match: { [`${field}.stemmed`]: { query: q, operator, boost: 1 } } });
    }
  }
  return { bool: { should, minimum_should_match: 1 } };
}

export function buildPoemSearchBody(params: {
  readonly q: string;
  readonly matchType: MatchType;
  readonly page: number;
  readonly poetSlugs: readonly string[];
  readonly eraSlugs: readonly string[];
  readonly meterSlugs: readonly string[];
  readonly themeSlugs: readonly string[];
  readonly rhymeSlugs: readonly string[];
  readonly collectionSlugs: readonly string[];
}) {
  const hasText = params.q.length > 0;
  const filter = termFilters({
    poetSlug: params.poetSlugs,
    eraSlug: params.eraSlugs,
    meterSlug: params.meterSlugs,
    themeSlug: params.themeSlugs,
    rhymeSlug: params.rhymeSlugs,
    collectionSlug: params.collectionSlugs,
  });
  const must = hasText
    ? [textClauses(params.q, ['title', 'content', 'poetName'], params.matchType)]
    : [{ match_all: {} }];
  return {
    from: (params.page - 1) * SEARCH_POEMS_PER_PAGE,
    size: SEARCH_POEMS_PER_PAGE,
    track_total_hits: true,
    query: { bool: { must, filter } },
    ...(hasText ? {} : { sort: [{ id: 'desc' }] as const }),
    highlight: {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      number_of_fragments: 1,
      fragment_size: 160,
      fields: { content: {}, title: {} },
    },
  };
}

export function buildPoetSearchBody(params: {
  readonly q: string;
  readonly matchType: MatchType;
  readonly page: number;
  readonly eraSlugs: readonly string[];
}) {
  const hasText = params.q.length > 0;
  const filter = termFilters({ eraSlug: params.eraSlugs });
  const must = hasText ? [textClauses(params.q, ['name'], params.matchType)] : [{ match_all: {} }];
  return {
    from: (params.page - 1) * SEARCH_POETS_PER_PAGE,
    size: SEARCH_POETS_PER_PAGE,
    track_total_hits: true,
    query: { bool: { must, filter } },
    ...(hasText ? {} : { sort: [{ id: 'desc' }] as const }),
    highlight: {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      number_of_fragments: 1,
      fragment_size: 200,
      fields: { name: {} },
    },
  };
}
