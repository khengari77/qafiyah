import type { MatchType, SearchType } from '@qafiyah/constants';
import {
  buildRandomPoemUrl,
  fetchRandomPoemText,
  type PoemSlug,
  poemSlugSchema,
  type RandomPoemTransportError,
} from '@qafiyah/contracts';
import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';
import { apiBrowser, type PoemsSearchEnvelope, type PoetsSearchEnvelope } from './rpc';
import { type ApiFetchError, callApi } from './static/result';

type SearchArgs = {
  readonly q: string;
  readonly searchType: SearchType;
  readonly page: string;
  readonly matchType: MatchType;
  readonly meterSlugs: readonly string[];
  readonly eraSlugs: readonly string[];
  readonly rhymeSlugs: readonly string[];
  readonly themeSlugs: readonly string[];
};

type SearchResult = PoemsSearchEnvelope | PoetsSearchEnvelope;

export function search(args: SearchArgs): Promise<Result<SearchResult, ApiFetchError>> {
  return callApi('search.search', { ...args }, () =>
    apiBrowser.search.search({
      q: args.q,
      searchType: args.searchType,
      page: args.page,
      matchType: args.matchType,
      meterSlugs: args.searchType === 'poems' ? [...args.meterSlugs] : [],
      rhymeSlugs: args.searchType === 'poems' ? [...args.rhymeSlugs] : [],
      themeSlugs: args.searchType === 'poems' ? [...args.themeSlugs] : [],
      eraSlugs: [...args.eraSlugs],
    })
  );
}

export type FetchRandomPoemSlugError =
  | RandomPoemTransportError
  | {
      readonly kind: 'invalid_slug';
      readonly url: string;
      readonly raw: string;
      readonly issues: readonly string[];
    };

export async function fetchRandomPoemSlug(
  baseUrl: string
): Promise<Result<PoemSlug, FetchRandomPoemSlugError>> {
  const textResult = await fetchRandomPoemText(baseUrl, 'slug');
  if (textResult.isErr()) return err(textResult.error);
  const slug = textResult.value;
  const parsed = v.safeParse(poemSlugSchema, slug);
  if (!parsed.success) {
    return err({
      kind: 'invalid_slug',
      url: buildRandomPoemUrl(baseUrl, 'slug'),
      raw: slug,
      issues: parsed.issues.map((i) => i.message),
    });
  }
  return ok(parsed.output);
}
