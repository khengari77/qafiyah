import { API_URL } from '@/constants/globals';
import { apiBrowser } from './rpc';
import type { PoemsSearchResponseData, PoetsSearchResponseData } from './types';

type SearchArgs = {
  q: string;
  searchType: 'poems' | 'poets';
  page: string;
  matchType: string;
  meterIds?: string;
  eraIds?: string;
  rhymeIds?: string;
  themeIds?: string;
};

type SearchResult = PoemsSearchResponseData | PoetsSearchResponseData;

export async function search(args: SearchArgs): Promise<SearchResult> {
  return apiBrowser.search.search({
    q: args.q,
    search_type: args.searchType,
    page: Number(args.page),
    match_type: args.matchType,
    meter_ids: args.searchType === 'poems' ? args.meterIds : undefined,
    rhyme_ids: args.searchType === 'poems' ? args.rhymeIds : undefined,
    theme_ids: args.searchType === 'poems' ? args.themeIds : undefined,
    era_ids: args.eraIds,
  });
}

export async function getRandomPoemSlug(): Promise<string> {
  // /poems/random returns text/plain (kept as a plain Hono route in apps/api).
  // Not exposed via oRPC, so we fetch it directly here.
  const response = await fetch(`${API_URL}/poems/random?option=slug`);
  if (!response.ok) {
    throw new Error(`Random poem request failed: ${response.status}`);
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    throw new Error('Random poem API returned empty slug');
  }
  return slug;
}
