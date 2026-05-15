/**
 * Static build-time data access (Astro SSG).
 * Calls the API over HTTP — at build time against a local Wrangler (started by
 * apps/web/scripts/build-with-api.mjs), at runtime against PROD_API_URL.
 */

import { ORPCError } from '@orpc/client';
import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { apiServer } from './rpc';
import type {
  Era,
  EraPoemsResponse,
  Meter,
  MeterPoemsResponse,
  Poem,
  Poet,
  PoetPoemsResponse,
  PoetsResponse,
  Rhyme,
  RhymePoemsResponse,
  Theme,
  ThemePoemsResponse,
} from './types';

const memo = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn();
  memo.set(key, p);
  return p;
}

function isNotFound(err: unknown): boolean {
  return err instanceof ORPCError && err.code === 'NOT_FOUND';
}

// ============================================================================
// Poems
// ============================================================================

export async function fetchAllPoemSlugs(): Promise<string[]> {
  const result = await apiServer.poems.listSlugs();
  return result.data;
}

export async function fetchPoem(slug: string): Promise<Poem | null> {
  try {
    const result = await apiServer.poems.getBySlug({ slug });
    return result.data;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Poets
// ============================================================================

export async function fetchPoets(page: string): Promise<PoetsResponse | null> {
  try {
    return await apiServer.poets.list({ page });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function fetchPoetsWithPoemCount(): Promise<Poet[]> {
  const allPoets: Poet[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPoets(page.toString());
    if (!response || response.data.length === 0) break;

    allPoets.push(...response.data);

    if (page >= response.pagination.totalPages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allPoets;
}

export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets('1');
  return response?.pagination.totalPages ?? 1;
}

export async function fetchPoetPoemPage(
  slug: string,
  page: string
): Promise<PoetPoemsResponse | null> {
  try {
    return await apiServer.poets.listPoems({ slug, page });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Eras
// ============================================================================

export async function fetchEras(): Promise<Era[]> {
  return dedup('eras:list', async () => (await apiServer.eras.list()).data);
}

export async function fetchErasWithPoemCount(): Promise<Era[]> {
  return fetchEras();
}

export async function fetchEraPoemPage(
  slug: string,
  page: string
): Promise<EraPoemsResponse | null> {
  try {
    return await apiServer.eras.listPoems({ slug, page });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Meters
// ============================================================================

export async function fetchMeters(): Promise<Meter[]> {
  return dedup('meters:list', async () => (await apiServer.meters.list()).data);
}

export async function fetchMetersWithPoemCount(): Promise<Meter[]> {
  return fetchMeters();
}

export async function fetchMeterPoemPage(
  slug: string,
  page: string
): Promise<MeterPoemsResponse | null> {
  try {
    return await apiServer.meters.listPoems({ slug, page });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Rhymes
// ============================================================================

export async function fetchRhymes(): Promise<Rhyme[]> {
  return dedup('rhymes:list', async () => (await apiServer.rhymes.list()).data);
}

export async function fetchRhymesWithPoemCount(): Promise<Rhyme[]> {
  return fetchRhymes();
}

export async function fetchRhymePoemPage(
  slug: string,
  page: string
): Promise<RhymePoemsResponse | null> {
  try {
    return await apiServer.rhymes.listPoems({ slug, page });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Themes
// ============================================================================

export async function fetchThemes(): Promise<Theme[]> {
  return dedup('themes:list', async () => (await apiServer.themes.list()).data);
}

export async function fetchThemesWithPoemCount(): Promise<Theme[]> {
  return fetchThemes();
}

export async function fetchThemePoemPage(
  slug: string,
  page: string
): Promise<ThemePoemsResponse | null> {
  try {
    return await apiServer.themes.listPoems({ slug, page });
  } catch (err) {
    if (isNotFound(err)) return null;
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
