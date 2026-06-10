import { POEMS_INDEX_ALIAS, POETS_INDEX_ALIAS } from '@qafiyah/constants';
import { ResultAsync } from 'neverthrow';
import type { SearchClient } from './client';
import { buildPoemSearchBody, buildPoetSearchBody } from './query';

export type SearchRunError = { readonly kind: 'es_error'; readonly message: string };

export type PoemHit = {
  readonly type: 'poem';
  readonly title: string;
  readonly slug: string;
  readonly snippet: string;
  readonly poet: { readonly name: string; readonly slug: string };
  readonly meter: { readonly name: string; readonly slug: string };
  readonly era: { readonly name: string; readonly slug: string };
  readonly relevance: number;
};

export type PoetHit = {
  readonly type: 'poet';
  readonly name: string;
  readonly slug: string;
  readonly era: { readonly name: string; readonly slug: string };
  readonly relevance: number;
};

export type SearchPage<T> = { readonly hits: readonly T[]; readonly total: number };

// Raw _source shapes from ES — all optional since we cast from unknown.
type PoemRaw = {
  slug?: string;
  title?: string;
  titleDisplay?: string;
  content?: string;
  poetName?: string;
  poetNameDisplay?: string;
  poetSlug?: string;
  eraName?: string;
  eraSlug?: string;
  meterName?: string;
  meterSlug?: string;
};

type PoetRaw = {
  slug?: string;
  name?: string;
  nameDisplay?: string;
  eraName?: string;
  eraSlug?: string;
};

const wrap = <T>(p: Promise<T>) =>
  ResultAsync.fromPromise(
    p,
    (c): SearchRunError => ({
      kind: 'es_error',
      message: c instanceof Error ? c.message : String(c),
    })
  );

function firstHighlight(
  hl: Record<string, string[]> | undefined,
  ...fields: string[]
): string | null {
  if (!hl) return null;
  for (const f of fields) {
    const frag = hl[f]?.[0];
    if (frag) return frag;
  }
  return null;
}

export function searchPoems(
  client: SearchClient,
  params: Parameters<typeof buildPoemSearchBody>[0]
) {
  return wrap(client.search({ index: POEMS_INDEX_ALIAS, ...buildPoemSearchBody(params) })).map(
    (res): SearchPage<PoemHit> => {
      const total =
        typeof res.hits.total === 'number' ? res.hits.total : (res.hits.total?.value ?? 0);
      const hits = res.hits.hits.map((h): PoemHit => {
        const s = h._source as PoemRaw;
        const verses = (s.content ?? '').split('*').slice(0, 2).join('*');
        return {
          type: 'poem',
          title: s.titleDisplay ?? s.title ?? '',
          slug: s.slug ?? '',
          snippet: firstHighlight(h.highlight, 'content', 'title') ?? verses,
          poet: { name: s.poetNameDisplay ?? s.poetName ?? '', slug: s.poetSlug ?? '' },
          meter: { name: s.meterName ?? '', slug: s.meterSlug ?? '' },
          era: { name: s.eraName ?? '', slug: s.eraSlug ?? '' },
          relevance: h._score ?? 0,
        };
      });
      return { hits, total };
    }
  );
}

export function searchPoets(
  client: SearchClient,
  params: Parameters<typeof buildPoetSearchBody>[0]
) {
  return wrap(client.search({ index: POETS_INDEX_ALIAS, ...buildPoetSearchBody(params) })).map(
    (res): SearchPage<PoetHit> => {
      const total =
        typeof res.hits.total === 'number' ? res.hits.total : (res.hits.total?.value ?? 0);
      const hits = res.hits.hits.map((h): PoetHit => {
        const s = h._source as PoetRaw;
        return {
          type: 'poet',
          name: firstHighlight(h.highlight, 'name') ?? s.nameDisplay ?? s.name ?? '',
          slug: s.slug ?? '',
          era: { name: s.eraName ?? '', slug: s.eraSlug ?? '' },
          relevance: h._score ?? 0,
        };
      });
      return { hits, total };
    }
  );
}
