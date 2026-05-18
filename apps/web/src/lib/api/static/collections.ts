import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import {
  apiServer,
  type Era,
  type EraPoemsResponse,
  type Meter,
  type MeterPoemsResponse,
  type Rhyme,
  type RhymePoemsResponse,
  type Theme,
  type ThemePoemsResponse,
} from '@/lib/api/rpc';
import { isNotFound, sharePromise } from './dedup';

export function fetchEras(): Promise<readonly Era[]> {
  return sharePromise('eras:list', async () => (await apiServer.eras.list()).data);
}

export async function fetchEraPoemPage(
  slug: EraSlug,
  page: number
): Promise<EraPoemsResponse | null> {
  try {
    return await apiServer.eras.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export function fetchMeters(): Promise<readonly Meter[]> {
  return sharePromise('meters:list', async () => (await apiServer.meters.list()).data);
}

export async function fetchMeterPoemPage(
  slug: MeterSlug,
  page: number
): Promise<MeterPoemsResponse | null> {
  try {
    return await apiServer.meters.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export function fetchRhymes(): Promise<readonly Rhyme[]> {
  return sharePromise('rhymes:list', async () => (await apiServer.rhymes.list()).data);
}

export async function fetchRhymePoemPage(
  slug: RhymeSlug,
  page: number
): Promise<RhymePoemsResponse | null> {
  try {
    return await apiServer.rhymes.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export function fetchThemes(): Promise<readonly Theme[]> {
  return sharePromise('themes:list', async () => (await apiServer.themes.list()).data);
}

export async function fetchThemePoemPage(
  slug: ThemeSlug,
  page: number
): Promise<ThemePoemsResponse | null> {
  try {
    return await apiServer.themes.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
