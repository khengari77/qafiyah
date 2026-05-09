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
import { db } from '../db';
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

// @NOTE: globalThis survives Vite SSR module boundaries — readable by astro:build:done hook
type BuildStats = { calls: number; timings: { label: string; ms: number }[] };
const _g = globalThis as typeof globalThis & { _qBuildStats?: BuildStats };
_g._qBuildStats ??= { calls: 0, timings: [] };
const _stats = _g._qBuildStats;

async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  suffix?: (r: T) => string
): Promise<T> {
  const callsBefore = _stats.calls;
  const t = performance.now();
  const result = await fn();
  const ms = performance.now() - t;
  _stats.timings.push({ label, ms });
  const extra = suffix ? ` | ${suffix(result)}` : '';
  console.log(
    `[build] ${label}: ${ms.toFixed(0)}ms | ${_stats.calls - callsBefore} queries${extra}`
  );
  return result;
}

// ============================================================================
// Poems
// ============================================================================

/**
 * Fetch all poem slugs for static generation.
 */
export function fetchAllPoemSlugsFast(): Promise<string[]> {
  return timed(
    'fetchAllPoemSlugsFast',
    async () => {
      const limit = 1000;
      const first = await poemsQueries.listPoemSlugs(db, 1, limit);
      _stats.calls++;
      const allSlugs = first.slugs.map((p) => p.slug);
      if (first.totalPages <= 1) return allSlugs;

      const remaining = await Promise.all(
        Array.from({ length: first.totalPages - 1 }, (_, i) => {
          _stats.calls++;
          return poemsQueries
            .listPoemSlugs(db, i + 2, limit)
            .then((r) => r.slugs.map((p) => p.slug))
            .catch(() => []);
        })
      );
      return [...allSlugs, ...remaining.flat()];
    },
    (slugs) => `${slugs.length} slugs`
  );
}

/**
 * Fetch a single poem by slug.
 */
export async function fetchPoem(slug: string): Promise<PoemResponseData | null> {
  try {
    _stats.calls++;
    const result = await poemsQueries.getPoemBySlug(db, slug);
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

/**
 * Fetch all poets with poem counts (for generating static params).
 */
export function fetchPoetsWithPoemCount(): Promise<PoetStats[]> {
  return timed(
    'fetchPoetsWithPoemCount',
    async () => {
      const allPoets: PoetStats[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const iterT = performance.now();
        const response = await fetchPoets(page.toString());
        console.log(`[build]   poets page ${page}: ${(performance.now() - iterT).toFixed(0)}ms`);

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
    },
    (poets) => `${poets.length} poets`
  );
}

/**
 * Fetch poets for a specific page.
 */
export async function fetchPoets(
  page: string
): Promise<{ data: PoetsData; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await poetsQueries.listPoets(db, Number(page));

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

/**
 * Get total number of poet pages.
 */
export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets('1');
  return response.pagination?.totalPages ?? 1;
}

/**
 * Fetch poems for a specific poet and page.
 */
export async function fetchPoetPoemPage(
  slug: string,
  page: string
): Promise<{ data: PoetPoems; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await poetsQueries.listPoetPoems(db, slug, Number(page));

  if (!result) {
    return { data: { poetDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as PoetPoems };
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

/**
 * Fetch all eras.
 */
export async function fetchEras(): Promise<Era[]> {
  _stats.calls++;
  return erasQueries.listEras(db) as Promise<Era[]>;
}

/**
 * Fetch all eras with poem counts for static params generation.
 */
export function fetchErasWithPoemCount(): Promise<EraStats[]> {
  return timed(
    'fetchErasWithPoemCount',
    async () => {
      const eras = await fetchEras();
      return eras.map((era) => ({
        slug: era.slug,
        name: era.name,
        poemsCount: era.poemsCount,
      }));
    },
    (eras) => `${eras.length} eras`
  );
}

/**
 * Fetch poems for a specific era and page.
 */
export async function fetchEraPoemPage(
  slug: string,
  page: string
): Promise<{ data: EraPoems; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await erasQueries.listEraPoems(db, slug, Number(page));

  if (!result) {
    return { data: { eraDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as EraPoems };
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

/**
 * Fetch all meters.
 */
export async function fetchMeters(): Promise<Meter[]> {
  _stats.calls++;
  return metersQueries.listMeters(db) as Promise<Meter[]>;
}

/**
 * Fetch all meters with poem counts for static params generation.
 */
export function fetchMetersWithPoemCount(): Promise<MeterStats[]> {
  return timed(
    'fetchMetersWithPoemCount',
    async () => {
      const meters = await fetchMeters();
      return meters.map((meter) => ({
        slug: meter.slug,
        name: meter.name,
        poemsCount: meter.poemsCount,
      }));
    },
    (meters) => `${meters.length} meters`
  );
}

/**
 * Fetch poems for a specific meter and page.
 */
export async function fetchMeterPoemPage(
  slug: string,
  page: string
): Promise<{ data: MeterPoems; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await metersQueries.listMeterPoems(db, slug, Number(page));

  if (!result) {
    return {
      data: { meterDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as MeterPoems,
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

/**
 * Fetch all rhymes.
 */
export async function fetchRhymes(): Promise<Rhyme[]> {
  _stats.calls++;
  return rhymesQueries.listRhymes(db) as Promise<Rhyme[]>;
}

/**
 * Fetch all rhymes with poem counts for static params generation.
 */
export function fetchRhymesWithPoemCount(): Promise<RhymeStats[]> {
  return timed(
    'fetchRhymesWithPoemCount',
    async () => {
      const rhymes = await fetchRhymes();
      return rhymes.map((rhyme) => ({
        slug: rhyme.slug,
        name: rhyme.name,
        poemsCount: rhyme.poemsCount,
      }));
    },
    (rhymes) => `${rhymes.length} rhymes`
  );
}

/**
 * Fetch poems for a specific rhyme and page.
 */
export async function fetchRhymePoemPage(
  slug: string,
  page: string
): Promise<{ data: RhymePoems; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await rhymesQueries.listRhymePoems(db, slug, Number(page));

  if (!result) {
    return {
      data: { rhymeDetails: { id: 0, pattern: '', poemsCount: 0 }, poems: [] } as RhymePoems,
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

/**
 * Fetch all themes.
 */
export async function fetchThemes(): Promise<Theme[]> {
  _stats.calls++;
  return themesQueries.listThemes(db) as Promise<Theme[]>;
}

/**
 * Fetch all themes with poem counts for static params generation.
 */
export function fetchThemesWithPoemCount(): Promise<ThemeStats[]> {
  return timed(
    'fetchThemesWithPoemCount',
    async () => {
      const themes = await fetchThemes();
      return themes.map((theme) => ({
        slug: theme.slug,
        name: theme.name,
        poemsCount: theme.poemsCount,
      }));
    },
    (themes) => `${themes.length} themes`
  );
}

/**
 * Fetch poems for a specific theme and page.
 */
export async function fetchThemePoemPage(
  slug: string,
  page: string
): Promise<{ data: ThemePoems; pagination?: PaginationMeta }> {
  _stats.calls++;
  const result = await themesQueries.listThemePoems(db, slug, Number(page));

  if (!result) {
    return {
      data: { themeDetails: { id: 0, name: '', poemsCount: 0 }, poems: [] } as ThemePoems,
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
 * Generate page numbers array from 1 to totalPages.
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
