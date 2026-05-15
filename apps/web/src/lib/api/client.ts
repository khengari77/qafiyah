import { API_RANDOM_POEM_PATH } from '@qafiyah/constants';
import { API_URL } from '@/constants/globals';
import { apiBrowser } from './rpc';
import type { PoemsSearchEnvelope, PoetsSearchEnvelope } from './types';

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

type SearchResult = PoemsSearchEnvelope | PoetsSearchEnvelope;

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
  const response = await fetch(`${API_URL}${API_RANDOM_POEM_PATH}?option=slug`);
  if (!response.ok) {
    throw new Error(`Random poem request failed: ${response.status}`);
  }
  const slug = (await response.text()).trim();
  if (!slug) {
    throw new Error('Random poem API returned empty slug');
  }
  return slug;
}
