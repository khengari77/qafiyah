import { API_URL } from '@/constants/globals';
import apiClient from './client';
import type { PaginationMeta, PoemsSearchResponseData, PoetsSearchResponseData } from './types';

const client = apiClient(API_URL);

export const queries = {
  async search({
    q,
    searchType,
    page = '1',
    matchType = 'all',
    meterIds,
    eraIds,
    rhymeIds,
    themeIds,
  }: {
    q: string;
    searchType: 'poems' | 'poets';
    page: string;
    matchType: string;
    meterIds?: string;
    eraIds?: string;
    rhymeIds?: string;
    themeIds?: string;
  }): Promise<{
    data: PoemsSearchResponseData | PoetsSearchResponseData;
    pagination?: PaginationMeta;
  }> {
    return client.search({ q, searchType, page, matchType, meterIds, eraIds, rhymeIds, themeIds });
  },

  async getRandomSlug(): Promise<string> {
    return client.getRandomSlug();
  },
};
