import { API_URL } from '@/constants/globals';
import type { PoemsSearchResponseData, PoetsSearchResponseData } from './types';

export type SearchArgs = {
  q: string;
  searchType: 'poems' | 'poets';
  page: string;
  matchType: string;
  meterIds?: string;
  eraIds?: string;
  rhymeIds?: string;
  themeIds?: string;
};

export type SearchResult = PoemsSearchResponseData | PoetsSearchResponseData;

export async function search(args: SearchArgs): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set('q', args.q);
  params.set('page', args.page);
  params.set('search_type', args.searchType);
  params.set('match_type', args.matchType);
  if (args.searchType === 'poems') {
    if (args.meterIds) params.set('meter_ids', args.meterIds);
    if (args.rhymeIds) params.set('rhyme_ids', args.rhymeIds);
    if (args.themeIds) params.set('theme_ids', args.themeIds);
  }
  if (args.eraIds) params.set('era_ids', args.eraIds);

  const response = await fetch(`${API_URL}/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }
  const json = (await response.json()) as { success: boolean; data: SearchResult };
  return json.data;
}

export async function getRandomPoemSlug(): Promise<string> {
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
