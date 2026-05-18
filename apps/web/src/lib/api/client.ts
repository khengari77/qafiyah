import { API_RANDOM_POEM_PATH, type MatchType, type SearchType } from '@qafiyah/constants';
import { type PoemSlug, poemSlugSchema } from '@qafiyah/contracts';
import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';
import { apiBrowser, type PoemsSearchEnvelope, type PoetsSearchEnvelope } from './rpc';

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

export function search(args: SearchArgs): Promise<SearchResult> {
  return apiBrowser.search.search({
    q: args.q,
    searchType: args.searchType,
    page: args.page,
    matchType: args.matchType,
    meterSlugs: args.searchType === 'poems' ? [...args.meterSlugs] : [],
    rhymeSlugs: args.searchType === 'poems' ? [...args.rhymeSlugs] : [],
    themeSlugs: args.searchType === 'poems' ? [...args.themeSlugs] : [],
    eraSlugs: [...args.eraSlugs],
  });
}

export type FetchRandomPoemSlugError =
  | {
      readonly kind: 'network';
      readonly url: string;
      readonly cause: { readonly message: string; readonly name?: string };
    }
  | { readonly kind: 'http_error'; readonly url: string; readonly status: number }
  | { readonly kind: 'empty_response'; readonly url: string }
  | {
      readonly kind: 'invalid_slug';
      readonly url: string;
      readonly raw: string;
      readonly issues: readonly string[];
    };

export async function fetchRandomPoemSlug(
  baseUrl: string
): Promise<Result<PoemSlug, FetchRandomPoemSlugError>> {
  const url = `${baseUrl}${API_RANDOM_POEM_PATH}?option=slug`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    return err({
      kind: 'network',
      url,
      cause: {
        message: cause instanceof Error ? cause.message : String(cause),
        ...(cause instanceof Error && cause.name ? { name: cause.name } : {}),
      },
    });
  }
  if (!response.ok) {
    return err({ kind: 'http_error', url, status: response.status });
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    return err({ kind: 'empty_response', url });
  }
  const parsed = v.safeParse(poemSlugSchema, slug);
  if (!parsed.success) {
    return err({
      kind: 'invalid_slug',
      url,
      raw: slug,
      issues: parsed.issues.map((i) => i.message),
    });
  }
  return ok(parsed.output);
}
