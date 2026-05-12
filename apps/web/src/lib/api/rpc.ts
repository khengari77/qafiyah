import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server';
import type { AppRouter } from '@qafiyah/api/router';
import { API_URL } from '@/constants/globals';

type ApiInputs = InferRouterInputs<AppRouter>;
export type ApiOutputs = InferRouterOutputs<AppRouter>;

/**
 * Base URL for build-time fetches (Astro getStaticPaths).
 * `BUILD_API_URL` is server-only (no `PUBLIC_` prefix) so it never leaks into the
 * browser bundle. Set by apps/web/scripts/build-with-api.mjs to the local Wrangler.
 * Falls back to the public API URL when not building.
 */
const SSR_BASE_URL = (import.meta.env['BUILD_API_URL'] as string | undefined) ?? API_URL;

/**
 * Base URL for browser fetches (search island, random poem button).
 * Always the public API URL — baked into the browser bundle at build time.
 */
const BROWSER_BASE_URL = API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`API ${status}: ${body}`);
  }
}

type FetchInit = { signal?: AbortSignal };

async function fetchJson<T>(url: string, init?: FetchInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

function makeClient(baseUrl: string) {
  return {
    eras: {
      list: (init?: FetchInit) => fetchJson<ApiOutputs['eras']['list']>(`${baseUrl}/eras`, init),
      listPoems: (input: ApiInputs['eras']['listPoems'], init?: FetchInit) =>
        fetchJson<ApiOutputs['eras']['listPoems']>(
          `${baseUrl}/eras/${encodeURIComponent(input.slug)}/page/${input.page}`,
          init
        ),
    },
    meters: {
      list: (init?: FetchInit) =>
        fetchJson<ApiOutputs['meters']['list']>(`${baseUrl}/meters`, init),
      listPoems: (input: ApiInputs['meters']['listPoems'], init?: FetchInit) =>
        fetchJson<ApiOutputs['meters']['listPoems']>(
          `${baseUrl}/meters/${encodeURIComponent(input.slug)}/page/${input.page}`,
          init
        ),
    },
    poems: {
      listSlugs: (input: ApiInputs['poems']['listSlugs'], init?: FetchInit) =>
        fetchJson<ApiOutputs['poems']['listSlugs']>(
          `${baseUrl}/poems/slugs${buildQuery({ page: input.page, limit: input.limit })}`,
          init
        ),
      listAllSlugs: (init?: FetchInit) =>
        fetchJson<ApiOutputs['poems']['listAllSlugs']>(`${baseUrl}/poems/slugs/all`, init),
      getBySlug: (input: ApiInputs['poems']['getBySlug'], init?: FetchInit) =>
        fetchJson<ApiOutputs['poems']['getBySlug']>(
          `${baseUrl}/poems/slug/${encodeURIComponent(input.slug)}`,
          init
        ),
    },
    poets: {
      list: (input: ApiInputs['poets']['list'], init?: FetchInit) =>
        fetchJson<ApiOutputs['poets']['list']>(`${baseUrl}/poets/page/${input.page}`, init),
      getBySlug: (input: ApiInputs['poets']['getBySlug'], init?: FetchInit) =>
        fetchJson<ApiOutputs['poets']['getBySlug']>(
          `${baseUrl}/poets/slug/${encodeURIComponent(input.slug)}`,
          init
        ),
      listPoems: (input: ApiInputs['poets']['listPoems'], init?: FetchInit) =>
        fetchJson<ApiOutputs['poets']['listPoems']>(
          `${baseUrl}/poets/${encodeURIComponent(input.slug)}/page/${input.page}`,
          init
        ),
    },
    rhymes: {
      list: (init?: FetchInit) =>
        fetchJson<ApiOutputs['rhymes']['list']>(`${baseUrl}/rhymes`, init),
      listPoems: (input: ApiInputs['rhymes']['listPoems'], init?: FetchInit) =>
        fetchJson<ApiOutputs['rhymes']['listPoems']>(
          `${baseUrl}/rhymes/${encodeURIComponent(input.slug)}/page/${input.page}`,
          init
        ),
    },
    themes: {
      list: (init?: FetchInit) =>
        fetchJson<ApiOutputs['themes']['list']>(`${baseUrl}/themes`, init),
      listPoems: (input: ApiInputs['themes']['listPoems'], init?: FetchInit) =>
        fetchJson<ApiOutputs['themes']['listPoems']>(
          `${baseUrl}/themes/${encodeURIComponent(input.slug)}/page/${input.page}`,
          init
        ),
    },
    search: {
      search: (input: ApiInputs['search']['search'], init?: FetchInit) =>
        fetchJson<ApiOutputs['search']['search']>(
          `${baseUrl}/search${buildQuery({
            q: input.q,
            search_type: input.search_type,
            page: input.page,
            match_type: input.match_type,
            meter_ids: input.meter_ids,
            era_ids: input.era_ids,
            rhyme_ids: input.rhyme_ids,
            theme_ids: input.theme_ids,
          })}`,
          init
        ),
    },
  };
}

/** Build-time client (Astro getStaticPaths). */
export const apiServer = makeClient(SSR_BASE_URL);

/** Runtime client (browser islands). */
export const apiBrowser = makeClient(BROWSER_BASE_URL);
