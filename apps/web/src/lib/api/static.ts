/**
 * Static build-time data access (Astro SSG).
 * Queries the database directly instead of going through the API HTTP layer.
 */

import {
  erasQueries,
  metersQueries,
  poemsQueries,
  poetsQueries,
  rhymesQueries,
  themesQueries,
} from '@qafiyah/db';
import { POEMS_PER_PAGE } from '@/constants/pagination';
import { getDb } from '../db';
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
// Poems
// ============================================================================

export function fetchAllPoemSlugs(): Promise<string[]> {
  return poemsQueries.listAllPoemSlugs(getDb());
}

export async function fetchPoem(slug: string): Promise<PoemResponseData | null> {
  try {
    const result = await poemsQueries.getPoemBySlug(getDb(), slug);
    if (result.type !== 'found') return null;
    return result.data as PoemResponseData;
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
  const result = await poetsQueries.listPoets(getDb(), Number(page));

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
}

export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets('1');
  return response.pagination?.totalPages ?? 1;
}

export async function fetchPoetPoemPage(
  slug: string,
  page: string
): Promise<{ data: PoetPoems; pagination?: PaginationMeta }> {
  const result = await poetsQueries.listPoetPoems(getDb(), slug, Number(page));

  if (!result) {
    return {
      data: { poetDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as unknown as PoetPoems,
    };
  }

  return {
    data: result as unknown as PoetPoems,
    pagination: {
      currentPage: Number(page),
      totalPages: result.totalPages,
      hasNextPage: Number(page) < result.totalPages,
      hasPrevPage: Number(page) > 1,
    },
  };
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
  return erasQueries.listEras(getDb()) as Promise<Era[]>;
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
  const result = await erasQueries.listEraPoems(getDb(), slug, Number(page));

  if (!result) {
    return {
      data: { eraDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as unknown as EraPoems,
    };
  }

  return {
    data: result as unknown as EraPoems,
    pagination: {
      currentPage: Number(page),
      totalPages: result.totalPages,
      hasNextPage: Number(page) < result.totalPages,
      hasPrevPage: Number(page) > 1,
    },
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

export async function fetchMeters(): Promise<Meter[]> {
  return metersQueries.listMeters(getDb()) as Promise<Meter[]>;
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
  const result = await metersQueries.listMeterPoems(getDb(), slug, Number(page));

  if (!result) {
    return {
      data: {
        meterDetails: { id: 0, name: '', poemsCount: 0 },
        poems: [],
      } as unknown as MeterPoems,
    };
  }

  return {
    data: result as unknown as MeterPoems,
    pagination: {
      currentPage: Number(page),
      totalPages: result.totalPages,
      hasNextPage: Number(page) < result.totalPages,
      hasPrevPage: Number(page) > 1,
    },
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

export async function fetchRhymes(): Promise<Rhyme[]> {
  return rhymesQueries.listRhymes(getDb()) as Promise<Rhyme[]>;
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
  const result = await rhymesQueries.listRhymePoems(getDb(), slug, Number(page));

  if (!result) {
    return {
      data: {
        rhymeDetails: { id: 0, pattern: '', poemsCount: 0 },
        poems: [],
      } as unknown as RhymePoems,
    };
  }

  return {
    data: result as unknown as RhymePoems,
    pagination: {
      currentPage: Number(page),
      totalPages: result.totalPages,
      hasNextPage: Number(page) < result.totalPages,
      hasPrevPage: Number(page) > 1,
    },
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

export async function fetchThemes(): Promise<Theme[]> {
  return themesQueries.listThemes(getDb()) as Promise<Theme[]>;
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
  const result = await themesQueries.listThemePoems(getDb(), slug, Number(page));

  if (!result) {
    return {
      data: {
        themeDetails: { id: 0, name: '', poemsCount: 0 },
        poems: [],
      } as unknown as ThemePoems,
    };
  }

  return {
    data: result as unknown as ThemePoems,
    pagination: {
      currentPage: Number(page),
      totalPages: result.totalPages,
      hasNextPage: Number(page) < result.totalPages,
      hasPrevPage: Number(page) > 1,
    },
  };
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
