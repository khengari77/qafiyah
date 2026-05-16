import { API_RANDOM_POEM_PATH } from '@qafiyah/constants';
import type { PoemSlug } from '@qafiyah/contracts';
import { API_URL } from '@/constants/globals';
import { apiBrowser } from './rpc';
import type { PoemsSearchEnvelope, PoetsSearchEnvelope } from './types';

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

export async function getRandomPoemSlug(): Promise<PoemSlug> {
  const response = await fetch(`${API_URL}${API_RANDOM_POEM_PATH}?option=slug`);
  if (!response.ok) {
    throw new Error(`Random poem request failed: ${response.status}`);
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    throw new Error('Random poem API returned empty slug');
  }
  return slug as PoemSlug;
}
