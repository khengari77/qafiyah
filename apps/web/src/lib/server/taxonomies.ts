import type { MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';
import { getOrNull, unwrap } from './unwrap';

export type Meter = ApiOutputs['meters']['get']['data'];
export type Rhyme = ApiOutputs['rhymes']['get']['data'];
export type Theme = ApiOutputs['themes']['get']['data'];

export const allEras = (): Promise<ApiOutputs['eras']['list']['data']> =>
  unwrap(apiServer.eras.list());
export const allMeters = (): Promise<ApiOutputs['meters']['list']['data']> =>
  unwrap(apiServer.meters.list());
export const allRhymes = (): Promise<ApiOutputs['rhymes']['list']['data']> =>
  unwrap(apiServer.rhymes.list());
export const allThemes = (): Promise<ApiOutputs['themes']['list']['data']> =>
  unwrap(apiServer.themes.list());

export const getMeter = (slug: MeterSlug): Promise<Meter | null> =>
  getOrNull(apiServer.meters.get({ slug }));
export const getRhyme = (slug: RhymeSlug): Promise<Rhyme | null> =>
  getOrNull(apiServer.rhymes.get({ slug }));
export const getTheme = (slug: ThemeSlug): Promise<Theme | null> =>
  getOrNull(apiServer.themes.get({ slug }));
