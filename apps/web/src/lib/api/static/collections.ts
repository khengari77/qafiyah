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

export function fetchEras(): Promise<Result<readonly Era[], ApiFetchError>> {
  return sharePromise('eras:list', () =>
    callApi('eras.list', undefined, () => apiServer.eras.list()).then((result) =>
      result.map((res) => res.data)
    )
  );
}

export function fetchEraPoemPage(
  slug: EraSlug,
  page: number
): Promise<Result<EraPoemsResponse, ApiFetchError>> {
  return callApi('eras.listPoems', { slug, page }, () =>
    apiServer.eras.listPoems({ slug, page: page.toString() })
  );
}

export function fetchMeters(): Promise<Result<readonly Meter[], ApiFetchError>> {
  return sharePromise('meters:list', () =>
    callApi('meters.list', undefined, () => apiServer.meters.list()).then((result) =>
      result.map((res) => res.data)
    )
  );
}

export function fetchMeterPoemPage(
  slug: MeterSlug,
  page: number
): Promise<Result<MeterPoemsResponse, ApiFetchError>> {
  return callApi('meters.listPoems', { slug, page }, () =>
    apiServer.meters.listPoems({ slug, page: page.toString() })
  );
}

export function fetchRhymes(): Promise<Result<readonly Rhyme[], ApiFetchError>> {
  return sharePromise('rhymes:list', () =>
    callApi('rhymes.list', undefined, () => apiServer.rhymes.list()).then((result) =>
      result.map((res) => res.data)
    )
  );
}

export function fetchRhymePoemPage(
  slug: RhymeSlug,
  page: number
): Promise<Result<RhymePoemsResponse, ApiFetchError>> {
  return callApi('rhymes.listPoems', { slug, page }, () =>
    apiServer.rhymes.listPoems({ slug, page: page.toString() })
  );
}

export function fetchThemes(): Promise<Result<readonly Theme[], ApiFetchError>> {
  return sharePromise('themes:list', () =>
    callApi('themes.list', undefined, () => apiServer.themes.list()).then((result) =>
      result.map((res) => res.data)
    )
  );
}

export function fetchThemePoemPage(
  slug: ThemeSlug,
  page: number
): Promise<Result<ThemePoemsResponse, ApiFetchError>> {
  return callApi('themes.listPoems', { slug, page }, () =>
    apiServer.themes.listPoems({ slug, page: page.toString() })
  );
}
