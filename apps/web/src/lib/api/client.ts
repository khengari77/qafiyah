import { buildApiUrl } from './config';
import type { PaginationMeta, PoemsSearchResponseData, PoetsSearchResponseData } from './types';

type SearchResponse = { success: true; data: PoemsSearchResponseData | PoetsSearchResponseData };

const apiClient = (baseUrl: string) => {
  return {
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
      const searchParams = new URLSearchParams();
      searchParams.append('q', q);
      searchParams.append('page', page);
      searchParams.append('search_type', searchType);
      searchParams.append('match_type', matchType);

      if (searchType === 'poems') {
        if (meterIds) searchParams.append('meter_ids', meterIds);
        if (rhymeIds) searchParams.append('rhyme_ids', rhymeIds);
        if (themeIds) searchParams.append('theme_ids', themeIds);
      }
      if (eraIds) searchParams.append('era_ids', eraIds);

      const response = await fetch(`${baseUrl}/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const json = (await response.json()) as SearchResponse;
      return {
        data: json.data,
        pagination:
          'pagination' in json.data
            ? (json.data.pagination as unknown as PaginationMeta)
            : undefined,
      };
    },

    async getRandomSlug(): Promise<string> {
      try {
        const response = await fetch(buildApiUrl('/poems/random?option=slug'));
        if (!response.ok) {
          return 'eabca780-811f-4ea4-949e-21df6efba15d';
        }
        const slug = await response.text();
        return slug.trim();
      } catch {
        return 'eabca780-811f-4ea4-949e-21df6efba15d';
      }
    },
  };
};

export default apiClient;
