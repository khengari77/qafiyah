import type { EraSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import type { Result } from 'neverthrow';
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
import { sharePromise } from './dedup';
import { type ApiFetchError, callApi } from './result';

export function fetchEras(): Promise<readonly Era[]> {
  return sharePromise('eras:list', async () => (await apiServer.eras.list()).data);
}

export function fetchEraPoemPage(
  slug: EraSlug,
  page: number
): Promise<Result<EraPoemsResponse, ApiFetchError>> {
  return callApi('eras.listPoems', { slug, page }, () =>
    apiServer.eras.listPoems({ slug, page: page.toString() })
  );
}

export function fetchMeters(): Promise<readonly Meter[]> {
  return sharePromise('meters:list', async () => (await apiServer.meters.list()).data);
}

export function fetchMeterPoemPage(
  slug: MeterSlug,
  page: number
): Promise<Result<MeterPoemsResponse, ApiFetchError>> {
  return callApi('meters.listPoems', { slug, page }, () =>
    apiServer.meters.listPoems({ slug, page: page.toString() })
  );
}

export function fetchRhymes(): Promise<readonly Rhyme[]> {
  return sharePromise('rhymes:list', async () => (await apiServer.rhymes.list()).data);
}

export function fetchRhymePoemPage(
  slug: RhymeSlug,
  page: number
): Promise<Result<RhymePoemsResponse, ApiFetchError>> {
  return callApi('rhymes.listPoems', { slug, page }, () =>
    apiServer.rhymes.listPoems({ slug, page: page.toString() })
  );
}

export function fetchThemes(): Promise<readonly Theme[]> {
  return sharePromise('themes:list', async () => (await apiServer.themes.list()).data);
}

export function fetchThemePoemPage(
  slug: ThemeSlug,
  page: number
): Promise<Result<ThemePoemsResponse, ApiFetchError>> {
  return callApi('themes.listPoems', { slug, page }, () =>
    apiServer.themes.listPoems({ slug, page: page.toString() })
  );
}
