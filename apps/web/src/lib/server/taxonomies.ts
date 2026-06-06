import { safe } from '@orpc/client';
import type { MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Meter = ApiOutputs['meters']['get']['data'];
export type Rhyme = ApiOutputs['rhymes']['get']['data'];
export type Theme = ApiOutputs['themes']['get']['data'];

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

export async function getMeter(slug: MeterSlug): Promise<Meter | null> {
  const { error, data } = await safe(apiServer.meters.get({ slug }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}

export async function getRhyme(slug: RhymeSlug): Promise<Rhyme | null> {
  const { error, data } = await safe(apiServer.rhymes.get({ slug }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}

export async function getTheme(slug: ThemeSlug): Promise<Theme | null> {
  const { error, data } = await safe(apiServer.themes.get({ slug }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}
