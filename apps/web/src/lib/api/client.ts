import { API_URL } from '@/constants/globals';
import { apiBrowser } from './rpc';
import type { PoemsSearchResponseData, PoetsSearchResponseData } from './types';

type SearchArgs = {
  q: string;
  searchType: 'poems' | 'poets';
  page: string;
  matchType: 'all' | 'any' | 'exact';
  meterSlugs: string[];
  eraSlugs: string[];
  rhymeSlugs: string[];
  themeSlugs: string[];
};

type SearchResult = PoemsSearchResponseData | PoetsSearchResponseData;

export async function search(args: SearchArgs): Promise<SearchResult> {
  return apiBrowser.search.search({
    q: args.q,
    searchType: args.searchType,
    page: args.page,
    matchType: args.matchType,
    meterSlugs: args.searchType === 'poems' ? args.meterSlugs : [],
    rhymeSlugs: args.searchType === 'poems' ? args.rhymeSlugs : [],
    themeSlugs: args.searchType === 'poems' ? args.themeSlugs : [],
    eraSlugs: args.eraSlugs,
  });
}

export async function getRandomPoemSlug(): Promise<string> {
  // /v1/poems/random returns text/plain (kept as a plain Hono route in apps/api).
  // Not exposed via oRPC, so we fetch it directly here.
  const response = await fetch(`${API_URL}/v1/poems/random?option=slug`);
  if (!response.ok) {
    throw new Error(`Random poem request failed: ${response.status}`);
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    throw new Error('Random poem API returned empty slug');
  }
  return slug;
}
