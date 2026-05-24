import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import type {
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  poemSearchResult,
  poetSearchResult,
} from '@qafiyah/contracts';
import { type PoemHit, type PoetHit, searchPoems, searchPoets } from '@qafiyah/search';
import type * as v from 'valibot';
import { publicProcedure } from './base';
import { buildPagination } from './envelope';

type PoemResult = v.InferOutput<typeof poemSearchResult>;
type PoetResult = v.InferOutput<typeof poetSearchResult>;

// ES documents carry trusted slugs from the indexed DB records; brand casts are safe here.
const toPoemResult = (h: PoemHit): PoemResult => ({
  type: 'poem',
  title: h.title,
  slug: h.slug as PoemSlug,
  snippet: h.snippet,
  poet: { name: h.poet.name, slug: h.poet.slug as PoetSlug },
  meter: { name: h.meter.name, slug: h.meter.slug as MeterSlug },
  era: { name: h.era.name, slug: h.era.slug as EraSlug },
  relevance: h.relevance,
});

const toPoetResult = (h: PoetHit): PoetResult => ({
  type: 'poet',
  name: h.name,
  slug: h.slug as PoetSlug,
  era: { name: h.era.name, slug: h.era.slug as EraSlug },
  relevance: h.relevance,
});

export const search = publicProcedure.search.search.handler(async ({ context, input, errors }) => {
  const wantPoems = input.types.includes('poems');
  const wantPoets = input.types.includes('poets');

  const [poemsRes, poetsRes] = await Promise.all([
    wantPoems
      ? searchPoems(context.es, {
          q: input.q,
          matchType: input.matchType,
          page: input.poemsPage,
          poetSlugs: input.poetSlugs,
          eraSlugs: input.eraSlugs,
          meterSlugs: input.meterSlugs,
          themeSlugs: input.themeSlugs,
          rhymeSlugs: input.rhymeSlugs,
          collectionSlugs: [],
        })
      : null,
    wantPoets
      ? searchPoets(context.es, {
          q: input.q,
          matchType: input.matchType,
          page: input.poetsPage,
          eraSlugs: input.eraSlugs,
        })
      : null,
  ]);

  if (poemsRes?.isErr()) {
    context.log?.({
      error_kind: poemsRes.error.kind,
      error_stage: 'searchPoems',
      error_detail: poemsRes.error.message,
    });
    throw errors.INTERNAL_SERVER_ERROR();
  }
  if (poetsRes?.isErr()) {
    context.log?.({
      error_kind: poetsRes.error.kind,
      error_stage: 'searchPoets',
      error_detail: poetsRes.error.message,
    });
    throw errors.INTERNAL_SERVER_ERROR();
  }

  // At this point both results are either null (not requested) or Ok — isErr() guards above exit early.
  const poemsPage = poemsRes?.isOk() ? poemsRes.value : null;
  const poetsPage = poetsRes?.isOk() ? poetsRes.value : null;

  const poems = poemsPage
    ? {
        data: poemsPage.hits.map(toPoemResult),
        pagination: buildPagination({
          page: input.poemsPage,
          pageSize: SEARCH_POEMS_PER_PAGE,
          totalItems: poemsPage.total,
        }),
      }
    : null;

  const poets = poetsPage
    ? {
        data: poetsPage.hits.map(toPoetResult),
        pagination: buildPagination({
          page: input.poetsPage,
          pageSize: SEARCH_POETS_PER_PAGE,
          totalItems: poetsPage.total,
        }),
      }
    : null;

  context.log?.({
    query_text: input.q || undefined,
    poems_count: poems?.data.length ?? 0,
    poets_count: poets?.data.length ?? 0,
  });

  return { q: input.q, poems, poets };
});
