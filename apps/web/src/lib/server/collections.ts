import { isDefinedError, safe } from '@orpc/client';
import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type EraPoems = ApiOutputs['eras']['listPoems'];
type MeterPoems = ApiOutputs['meters']['listPoems'];
type RhymePoems = ApiOutputs['rhymes']['listPoems'];
type ThemePoems = ApiOutputs['themes']['listPoems'];

export async function allEras(): Promise<ApiOutputs['eras']['list']['data']> {
  const { error, data } = await safe(apiServer.eras.list());
  if (error) throw error;
  return data.data;
}
export async function allMeters(): Promise<ApiOutputs['meters']['list']['data']> {
  const { error, data } = await safe(apiServer.meters.list());
  if (error) throw error;
  return data.data;
}
export async function allRhymes(): Promise<ApiOutputs['rhymes']['list']['data']> {
  const { error, data } = await safe(apiServer.rhymes.list());
  if (error) throw error;
  return data.data;
}
export async function allThemes(): Promise<ApiOutputs['themes']['list']['data']> {
  const { error, data } = await safe(apiServer.themes.list());
  if (error) throw error;
  return data.data;
}

export async function getEraPoemsPage(
  slug: EraSlug,
  page: number
): Promise<{
  poems: EraPoems['data'];
  era: EraPoems['meta'];
  pagination: EraPoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.eras.listPoems({ slug, page: String(page) }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, era: data.meta, pagination: data.pagination };
}

export async function getMeterPoemsPage(
  slug: MeterSlug,
  page: number
): Promise<{
  poems: MeterPoems['data'];
  meter: MeterPoems['meta'];
  pagination: MeterPoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.meters.listPoems({ slug, page: String(page) }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, meter: data.meta, pagination: data.pagination };
}

export async function getRhymePoemsPage(
  slug: RhymeSlug,
  page: number
): Promise<{
  poems: RhymePoems['data'];
  rhyme: RhymePoems['meta'];
  pagination: RhymePoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.rhymes.listPoems({ slug, page: String(page) }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, rhyme: data.meta, pagination: data.pagination };
}

export async function getThemePoemsPage(
  slug: ThemeSlug,
  page: number
): Promise<{
  poems: ThemePoems['data'];
  theme: ThemePoems['meta'];
  pagination: ThemePoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.themes.listPoems({ slug, page: String(page) }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, theme: data.meta, pagination: data.pagination };
}
