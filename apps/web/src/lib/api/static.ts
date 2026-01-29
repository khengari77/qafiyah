/**
 * Static API utilities for build-time data fetching.
 * These functions are used during Next.js static generation to fetch data from the local API.
 */

import { API_URL } from '@/constants/GLOBALS';
import type {
  Era,
  EraPoems,
  Meter,
  MeterPoems,
  PaginationMeta,
  PoemResponseData,
  PoetPoems,
  PoetsData,
  Rhyme,
  RhymePoems,
  Theme,
  ThemePoems,
} from './types';

const FETCH_PER_PAGE = 30;
const MAX_URLS_PER_SITEMAP = 1000;

function isConnectionError(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause && typeof cause === 'object' && 'code' in cause) {
    return (cause as { code?: string }).code === 'ECONNREFUSED';
  }
  return false;
}

/**
 * Helper to fetch JSON from API with error handling.
 * Throws on non-OK response; callers should catch connection errors when building static params.
 */
async function fetchApi<T>(endpoint: string): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Poems
// ============================================================================

type PoemsFullDataItem = {
  slug: string;
};

/**
 * Fetch all poem slugs for generateStaticParams.
 * Uses the /poems/slugs endpoint to paginate through all poems.
 */
export async function fetchAllPoemSlugs(): Promise<string[]> {
  const allSlugs: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetchApi<{
        success: boolean;
        data: PoemsFullDataItem[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(`/poems/slugs?page=${page}&limit=${MAX_URLS_PER_SITEMAP}`);

      if (!response.success || !response.data || response.data.length === 0) {
        hasMore = false;
        break;
      }

      allSlugs.push(...response.data.map((p) => p.slug));

      if (page >= response.meta.totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      // If slugs endpoint doesn't exist or API is down, fall back or return []
      if (isConnectionError(error)) {
        console.warn('fetchAllPoemSlugs: API unreachable, returning no slugs', error);
        return [];
      }
      console.warn('fetchAllPoemSlugs: falling back to alternative method', error);
      try {
        return await fetchAllPoemSlugsFallback();
      } catch (fallbackError) {
        if (isConnectionError(fallbackError)) {
          console.warn(
            'fetchAllPoemSlugs: fallback failed (API unreachable), returning no slugs',
            fallbackError
          );
          return [];
        }
        throw fallbackError;
      }
    }
  }

  return allSlugs;
}

/**
 * Fallback method to get poem slugs by iterating through all poets and their poems.
 * Returns [] if the API is unreachable.
 */
async function fetchAllPoemSlugsFallback(): Promise<string[]> {
  let poets: PoetStats[];
  try {
    poets = await fetchAllPoetsWithStats();
  } catch (error) {
    if (isConnectionError(error)) {
      return [];
    }
    throw error;
  }
  const allSlugs: string[] = [];

  for (const poet of poets) {
    const totalPages = Math.ceil(poet.poemsCount / FETCH_PER_PAGE);
    for (let page = 1; page <= totalPages; page++) {
      try {
        const response = await fetchPoetPoems(poet.slug, page.toString());
        if (response.data?.poems) {
          allSlugs.push(...response.data.poems.map((p) => p.slug));
        }
      } catch (error) {
        console.error(`Error fetching poems for poet ${poet.slug} page ${page}:`, error);
      }
    }
  }

  return allSlugs;
}

/**
 * Fetch a single poem by slug
 */
export async function fetchPoem(slug: string): Promise<PoemResponseData | null> {
  try {
    const response = await fetchApi<{ success: boolean; data: PoemResponseData }>(
      `/poems/slug/${slug}`
    );
    return response.success ? response.data : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Poets
// ============================================================================

type PoetStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

/**
 * Fetch all poets with their stats (for generating static params)
 */
export async function fetchAllPoetsWithStats(): Promise<PoetStats[]> {
  const allPoets: PoetStats[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPoets(page.toString());
    if (!response.data?.poets || response.data.poets.length === 0) {
      hasMore = false;
      break;
    }

    allPoets.push(
      ...response.data.poets.map((p) => ({
        slug: String(p.slug ?? '')
          .toLowerCase()
          .replace(/^cat-poet-/, ''),
        name: p.name,
        poemsCount: p.poemsCount,
      }))
    );

    const totalPages = response.pagination?.totalPages ?? 1;
    if (page >= totalPages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allPoets;
}

/**
 * Fetch poets for a specific page
 */
export async function fetchPoets(
  page: string
): Promise<{ data: PoetsData; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: PoetsData;
    meta?: { pagination: PaginationMeta };
  }>(`/poets/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

/**
 * Get total number of poet pages
 */
export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets('1');
  return response.pagination?.totalPages ?? 1;
}

/**
 * Fetch poems for a specific poet and page
 */
export async function fetchPoetPoems(
  slug: string,
  page: string
): Promise<{ data: PoetPoems; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: PoetPoems;
    meta?: { pagination: PaginationMeta };
  }>(`/poets/${slug}/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

type PoetBasicInfo = {
  poet: {
    name: string;
    poemsCount: number;
    era: { name: string; slug: string } | null;
  };
};

/**
 * Fetch basic poet information (name, poems count, era)
 */
export async function fetchPoetInfo(slug: string): Promise<PoetBasicInfo | null> {
  try {
    const response = await fetchApi<{ success: boolean; data: PoetBasicInfo }>(
      `/poets/slug/${slug}`
    );
    return response.success ? response.data : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Eras
// ============================================================================

type EraStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

/**
 * Fetch all eras
 */
export async function fetchEras(): Promise<Era[]> {
  const response = await fetchApi<{ success: boolean; data: Era[] }>('/eras');
  return response.data;
}

/**
 * Fetch all eras with poem counts for static params generation
 */
export async function fetchAllErasWithStats(): Promise<EraStats[]> {
  const eras = await fetchEras();
  return eras.map((era) => ({
    slug: era.slug,
    name: era.name,
    poemsCount: era.poemsCount,
  }));
}

/**
 * Fetch poems for a specific era and page
 */
export async function fetchEraPoems(
  slug: string,
  page: string
): Promise<{ data: EraPoems; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: EraPoems;
    meta?: { pagination: PaginationMeta };
  }>(`/eras/${slug}/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

// ============================================================================
// Meters
// ============================================================================

type MeterStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

/**
 * Fetch all meters
 */
export async function fetchMeters(): Promise<Meter[]> {
  const response = await fetchApi<{ success: boolean; data: Meter[] }>('/meters');
  return response.data;
}

/**
 * Fetch all meters with poem counts for static params generation
 */
export async function fetchAllMetersWithStats(): Promise<MeterStats[]> {
  const meters = await fetchMeters();
  return meters.map((meter) => ({
    slug: meter.slug,
    name: meter.name,
    poemsCount: meter.poemsCount,
  }));
}

/**
 * Fetch poems for a specific meter and page
 */
export async function fetchMeterPoems(
  slug: string,
  page: string
): Promise<{ data: MeterPoems; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: MeterPoems;
    meta?: { pagination: PaginationMeta };
  }>(`/meters/${slug}/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

// ============================================================================
// Rhymes
// ============================================================================

type RhymeStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

/**
 * Fetch all rhymes
 */
export async function fetchRhymes(): Promise<Rhyme[]> {
  const response = await fetchApi<{ success: boolean; data: Rhyme[] }>('/rhymes');
  return response.data;
}

/**
 * Fetch all rhymes with poem counts for static params generation
 */
export async function fetchAllRhymesWithStats(): Promise<RhymeStats[]> {
  const rhymes = await fetchRhymes();
  return rhymes.map((rhyme) => ({
    slug: rhyme.slug,
    name: rhyme.name,
    poemsCount: rhyme.poemsCount,
  }));
}

/**
 * Fetch poems for a specific rhyme and page
 */
export async function fetchRhymePoems(
  slug: string,
  page: string
): Promise<{ data: RhymePoems; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: RhymePoems;
    meta?: { pagination: PaginationMeta };
  }>(`/rhymes/${slug}/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

// ============================================================================
// Themes
// ============================================================================

type ThemeStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

/**
 * Fetch all themes
 */
export async function fetchThemes(): Promise<Theme[]> {
  const response = await fetchApi<{ success: boolean; data: Theme[] }>('/themes');
  return response.data;
}

/**
 * Fetch all themes with poem counts for static params generation
 */
export async function fetchAllThemesWithStats(): Promise<ThemeStats[]> {
  const themes = await fetchThemes();
  return themes.map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    poemsCount: theme.poemsCount,
  }));
}

/**
 * Fetch poems for a specific theme and page
 */
export async function fetchThemePoems(
  slug: string,
  page: string
): Promise<{ data: ThemePoems; pagination?: PaginationMeta }> {
  const response = await fetchApi<{
    success: boolean;
    data: ThemePoems;
    meta?: { pagination: PaginationMeta };
  }>(`/themes/${slug}/page/${page}`);

  return {
    data: response.data,
    pagination: response.meta?.pagination,
  };
}

// ============================================================================
// Utility functions for generating static params
// ============================================================================

/**
 * Generate page numbers array from 1 to totalPages
 */
export function generatePageNumbers(
  totalCount: number,
  perPage: number = FETCH_PER_PAGE
): number[] {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Generate static params for paginated category routes
 */
export async function generateCategoryStaticParams(
  fetchStats: () => Promise<Array<{ slug: string; poemsCount: number }>>
): Promise<Array<{ slug: string; page: string }>> {
  const items = await fetchStats();
  const params: Array<{ slug: string; page: string }> = [];

  for (const item of items) {
    const pages = generatePageNumbers(item.poemsCount);
    for (const page of pages) {
      params.push({ slug: item.slug, page: page.toString() });
    }
  }

  return params;
}
