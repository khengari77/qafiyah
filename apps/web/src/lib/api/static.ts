/**
 * Static build-time data access (Astro SSG).
 * Calls the API over HTTP — at build time against a local Wrangler (started by
 * apps/web/scripts/build-with-api.mjs), at runtime against PROD_API_URL.
 */

import { POEMS_PER_PAGE } from '@/constants/pagination';
import { ApiError, apiServer } from './rpc';
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

// ============================================================================
// In-process memo for list endpoints. Many getStaticPaths calls fan out the
// same `/eras`, `/meters`, `/rhymes`, `/themes` listing — dedupe within one build.
// ============================================================================

const memo = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  memo.set(key, p);
  return p;
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

// ============================================================================
// Poems
// ============================================================================

export async function fetchAllPoemSlugs(): Promise<string[]> {
  const result = await apiServer.poems.listAllSlugs();
  return result.map((row: unknown) =>
    typeof row === 'string' ? row : ((row as { slug?: string })?.slug ?? String(row))
  );
}

export async function fetchPoem(slug: string): Promise<PoemResponseData | null> {
  try {
    return await apiServer.poems.getBySlug({ slug });
  } catch (err) {
    if (isNotFound(err)) return null;
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

export async function fetchPoetsWithPoemCount(): Promise<PoetStats[]> {
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

export async function fetchPoets(
  page: string
): Promise<{ data: PoetsData; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.poets.list({ page: Number(page) });
    return {
      data: { poets: result.poets } as PoetsData,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        totalItems: result.totalPoets,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return { data: { poets: [] } as PoetsData };
    }
    throw err;
  }
}

export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets('1');
  return response.pagination?.totalPages ?? 1;
}

export async function fetchPoetPoemPage(
  slug: string,
  page: string
): Promise<{ data: PoetPoems; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.poets.listPoems({ slug, page: Number(page) });
    return {
      data: result,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        data: {
          poetDetails: { id: 0, name: '', poemsCount: 0 },
          poems: [],
        } as unknown as PoetPoems,
      };
    }
    throw err;
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

export async function fetchEras(): Promise<Era[]> {
  return dedup('eras:list', () => apiServer.eras.list()) as Promise<Era[]>;
}

export async function fetchErasWithPoemCount(): Promise<EraStats[]> {
  const eras = await fetchEras();
  return eras.map((era) => ({
    slug: era.slug,
    name: era.name,
    poemsCount: era.poemsCount,
  }));
}

export async function fetchEraPoemPage(
  slug: string,
  page: string
): Promise<{ data: EraPoems; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.eras.listPoems({ slug, page: Number(page) });
    return {
      data: result,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        data: { eraDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as unknown as EraPoems,
      };
    }
    throw err;
  }
}

// ============================================================================
// Meters
// ============================================================================

type MeterStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

export async function fetchMeters(): Promise<Meter[]> {
  return dedup('meters:list', () => apiServer.meters.list()) as Promise<Meter[]>;
}

export async function fetchMetersWithPoemCount(): Promise<MeterStats[]> {
  const meters = await fetchMeters();
  return meters.map((meter) => ({
    slug: meter.slug,
    name: meter.name,
    poemsCount: meter.poemsCount,
  }));
}

export async function fetchMeterPoemPage(
  slug: string,
  page: string
): Promise<{ data: MeterPoems; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.meters.listPoems({ slug, page: Number(page) });
    return {
      data: result,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        data: {
          meterDetails: { id: 0, name: '', poemsCount: 0 },
          poems: [],
        } as unknown as MeterPoems,
      };
    }
    throw err;
  }
}

// ============================================================================
// Rhymes
// ============================================================================

type RhymeStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

export async function fetchRhymes(): Promise<Rhyme[]> {
  return dedup('rhymes:list', () => apiServer.rhymes.list()) as Promise<Rhyme[]>;
}

export async function fetchRhymesWithPoemCount(): Promise<RhymeStats[]> {
  const rhymes = await fetchRhymes();
  return rhymes.map((rhyme) => ({
    slug: rhyme.slug,
    name: rhyme.name,
    poemsCount: rhyme.poemsCount,
  }));
}

export async function fetchRhymePoemPage(
  slug: string,
  page: string
): Promise<{ data: RhymePoems; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.rhymes.listPoems({ slug, page: Number(page) });
    return {
      data: result,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        data: {
          rhymeDetails: { id: 0, pattern: '', poemsCount: 0 },
          poems: [],
        } as unknown as RhymePoems,
      };
    }
    throw err;
  }
}

// ============================================================================
// Themes
// ============================================================================

type ThemeStats = {
  slug: string;
  name: string;
  poemsCount: number;
};

export async function fetchThemes(): Promise<Theme[]> {
  return dedup('themes:list', () => apiServer.themes.list()) as Promise<Theme[]>;
}

export async function fetchThemesWithPoemCount(): Promise<ThemeStats[]> {
  const themes = await fetchThemes();
  return themes.map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    poemsCount: theme.poemsCount,
  }));
}

export async function fetchThemePoemPage(
  slug: string,
  page: string
): Promise<{ data: ThemePoems; pagination?: PaginationMeta }> {
  try {
    const result = await apiServer.themes.listPoems({ slug, page: Number(page) });
    return {
      data: result,
      pagination: {
        currentPage: Number(page),
        totalPages: result.totalPages,
        hasNextPage: Number(page) < result.totalPages,
        hasPrevPage: Number(page) > 1,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      return {
        data: {
          themeDetails: { id: 0, name: '', poemsCount: 0 },
          poems: [],
        } as unknown as ThemePoems,
      };
    }
    throw err;
  }
}

// ============================================================================
// Utility functions for generating static params
// ============================================================================

/**
 * Returns [] when totalCount === 0 so no static params are generated for entities with zero poems.
 */
export function generatePageNumbers(
  totalCount: number,
  perPage: number = POEMS_PER_PAGE
): number[] {
  if (totalCount === 0) return [];

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}
