import { API_RANDOM_POEM_PATH } from '@qafiyah/constants';
import { type PoemSlug, poemSlugSchema } from '@qafiyah/contracts';
import * as v from 'valibot';
import { apiBrowser, type PoemsSearchEnvelope, type PoetsSearchEnvelope } from './rpc';

type SearchArgs = {
  readonly q: string;
  readonly searchType: 'poems' | 'poets';
  readonly page: string;
  readonly matchType: 'all' | 'any' | 'exact';
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

export async function getRandomPoemSlug(baseUrl: string): Promise<PoemSlug> {
  const response = await fetch(`${baseUrl}${API_RANDOM_POEM_PATH}?option=slug`);
  if (!response.ok) {
    throw new Error(`Random poem request failed: ${response.status}`);
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    throw new Error('Random poem API returned empty slug');
  }
  return v.parse(poemSlugSchema, slug);
}
