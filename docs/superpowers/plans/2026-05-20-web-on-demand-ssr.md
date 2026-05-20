# Web On-Demand SSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/web` from a static build with a DB snapshot into on-demand Astro SSR that fetches from the existing internal API via the oRPC contract, served behind an nginx `proxy_cache` in a single web container.

**Architecture:** `output: 'server'` + `@astrojs/node` (standalone, run under Bun). Pages fetch per-request from the `api` container (`apiServer`, internal oRPC client) and set `Cache-Control`; nginx proxies + caches HTML and serves built static assets from disk. Browser islands keep calling the production API unchanged. The whole `generate-snapshot.ts` + `.data/` + `src/lib/data/*` machinery is deleted.

**Tech Stack:** Astro 6, `@astrojs/node@^10`, Bun 1.3.14, oRPC (`@orpc/client` `safe`/`ORPCError`/`isDefinedError`), Valibot, nginx 1.27, Docker Compose, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-20-web-on-demand-ssr-design.md`

---

## Execution notes (read first)

- **Commit with `--no-verify` for every task in this plan.** `.husky/pre-commit` runs the **whole** `bun run ci`, whose `smoke` step boots `bun run dev` and asserts ~15 real URLs return 200. That is hostile to incremental migration commits: a fresh worktree has no `.data/` (so the pre-cutover static smoke fails), the app is half-migrated mid-cutover, and post-cutover the smoke needs the api+DB running. So **all commit commands below use `git commit --no-verify`** (this also skips the commit-msg length hook — keep messages short and Conventional anyway). The per-task verification steps in this plan are the real per-task gates, and **Task 22 runs the full `bun run ci` once at the end** as the authoritative gate.
- **Run on a feature branch / worktree.** The cutover (Phase 2) leaves `astro build` temporarily red between Task 8 and Task 16 — a global `output: 'server'` flip cannot coexist with not-yet-converted `getStaticPaths` pages. **Unit tests (`vitest`) stay green on every commit**; the full `astro build` is the gate at Task 16, before any container or merge work.
- **The local DB must be up for any dev/SSR step.** `bun run db:setup` (Docker Postgres on :5433 + writes `apps/api/.env`) and a running API (`bun --filter @qafiyah/api run dev`, or the full `bun run dev`) are prerequisites for every `astro dev`/`astro preview`/smoke step here — SSR fetches from the API at request time. (This is a behavior change: the old static smoke only needed the `.data/` snapshot files, not a live API.)
- **Package manager: `bun`** (never npm/pnpm here). Workspace commands run from the package dir or via `bun --filter @qafiyah/web run <script>`.
- **No changes to `apps/api`, `packages/*`.** The API already exposes every endpoint the pages need.

---

## File Structure

**Created:**

- `apps/web/src/lib/server/env.ts` — resolves + validates `INTERNAL_API_URL` (runtime `process.env`).
- `apps/web/src/lib/server/client.ts` — `apiServer` oRPC client pointed at the internal API.
- `apps/web/src/lib/server/types.ts` — `ApiOutputs` derived from the contract.
- `apps/web/src/lib/server/cache.ts` — `cacheControl()` + `CACHE_*` constants.
- `apps/web/src/lib/server/poems.ts` — `getPoem(slug)`.
- `apps/web/src/lib/server/collections.ts` — `allEras/allMeters/allRhymes/allThemes`, `get{Era,Meter,Rhyme,Theme}PoemsPage`.
- `apps/web/src/lib/server/poets.ts` — `getPoetsPage(page)`, `getPoetPoemsPage(slug, page)`.
- `apps/web/src/lib/server/sitemap.ts` — pure XML builders + shard math.
- `apps/web/src/pages/sitemap-index.xml.ts`, `apps/web/src/pages/sitemap/poems/[page].xml.ts`, `apps/web/src/pages/sitemap/poets.xml.ts`, `apps/web/src/pages/sitemap/collections.xml.ts`.
- `apps/web/docker-entrypoint.sh` — starts the Bun SSR server + nginx.
- Test files alongside each `src/lib/server/*` module.

**Modified:**

- `apps/web/astro.config.mjs`, `apps/web/package.json`, `apps/web/src/lib/page-numbers.ts` (+ new test), the 11 page `.astro` files, `apps/web/scripts/verify-seo.ts`, `apps/web/nginx.conf`, `apps/web/Dockerfile`, `docker-compose.yml`, `.gitignore`, `docs/DEPLOYMENT.md`, `CLAUDE.md`.

**Deleted:**

- `apps/web/scripts/generate-snapshot.ts`, `apps/web/scripts/build.ts`, `apps/web/src/lib/data/` (loader.ts, poems.ts, poets.ts, collections.ts + their `.test.ts`), `generatePageNumbers` from `page-numbers.ts`.

---

# Phase 1 — Server data layer (additive; `vitest` green each commit; static build still works)

## Task 1: Internal API URL resolver + server client

**Files:**
- Create: `apps/web/src/lib/server/env.ts`
- Create: `apps/web/src/lib/server/env.test.ts`
- Create: `apps/web/src/lib/server/client.ts`
- Create: `apps/web/src/lib/server/types.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/env.test.ts
import { describe, expect, it } from 'vitest';
import { resolveInternalApiUrl } from './env';

describe('resolveInternalApiUrl', () => {
  it('defaults to the local API dev server when unset', () => {
    expect(resolveInternalApiUrl(undefined)).toBe('http://localhost:8787');
  });

  it('returns a provided valid URL unchanged', () => {
    expect(resolveInternalApiUrl('http://api:8787')).toBe('http://api:8787');
  });

  it('throws on a non-URL value', () => {
    expect(() => resolveInternalApiUrl('not-a-url')).toThrow('INTERNAL_API_URL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/env.test.ts`
Expected: FAIL — `Failed to resolve import "./env"`.

- [ ] **Step 3: Implement `env.ts`**

```ts
// apps/web/src/lib/server/env.ts
import { DEV_API_PORT } from '@qafiyah/constants';
import * as v from 'valibot';

const urlSchema = v.pipe(v.string(), v.url());

/**
 * Resolves the internal API base URL the SSR server calls. Reads from
 * process.env at runtime (NOT import.meta.env — this must not be inlined into
 * the browser bundle, and `src/lib/server/*` is never imported by an island).
 */
export function resolveInternalApiUrl(raw: string | undefined): string {
  const candidate = raw ?? `http://localhost:${DEV_API_PORT}`;
  const parsed = v.safeParse(urlSchema, candidate);
  if (!parsed.success) {
    throw new Error(`INTERNAL_API_URL is not a valid URL: ${JSON.stringify(candidate)}`);
  }
  return parsed.output;
}

export const INTERNAL_API_URL = resolveInternalApiUrl(process.env['INTERNAL_API_URL']);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `types.ts` and `client.ts`** (no separate test — wiring, exercised by accessor tests)

```ts
// apps/web/src/lib/server/types.ts
import type { InferContractRouterOutputs } from '@orpc/contract';
import type { AppContract } from '@qafiyah/contracts';

export type ApiOutputs = InferContractRouterOutputs<AppContract>;
```

```ts
// apps/web/src/lib/server/client.ts
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { INTERNAL_API_URL } from './env';

// Mirror of apiBrowser (src/lib/api/rpc.ts) but pointed at the internal API
// container instead of production. SSR-only; never imported by a client island.
const SERVER_BASE_URL = `${INTERNAL_API_URL}${API_V1_PREFIX}`;

export const apiServer: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, { url: SERVER_BASE_URL })
);
```

- [ ] **Step 6: Type-check passes**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: PASS (no errors from the new files).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/server/env.ts apps/web/src/lib/server/env.test.ts apps/web/src/lib/server/client.ts apps/web/src/lib/server/types.ts
git commit --no-verify -m "feat(web): add internal API oRPC client for SSR"
```

---

## Task 2: Cache-Control constants

**Files:**
- Create: `apps/web/src/lib/server/cache.ts`
- Create: `apps/web/src/lib/server/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/cache.test.ts
import { describe, expect, it } from 'vitest';
import { CACHE_INDEX, CACHE_LIST, CACHE_NONE, CACHE_POEM, CACHE_SITEMAP, cacheControl } from './cache';

describe('cacheControl', () => {
  it('formats max-age + stale-while-revalidate', () => {
    expect(cacheControl(3600, 86400)).toBe('public, max-age=3600, stale-while-revalidate=86400');
  });
});

describe('cache constants', () => {
  it('poems cache 24h / SWR 7d', () => {
    expect(CACHE_POEM).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });
  it('lists and indexes cache 1h / SWR 24h', () => {
    expect(CACHE_LIST).toBe('public, max-age=3600, stale-while-revalidate=86400');
    expect(CACHE_INDEX).toBe('public, max-age=3600, stale-while-revalidate=86400');
  });
  it('sitemap cache 24h / SWR 7d', () => {
    expect(CACHE_SITEMAP).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });
  it('404 is uncacheable', () => {
    expect(CACHE_NONE).toBe('no-store');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/cache.test.ts`
Expected: FAIL — `Failed to resolve import "./cache"`.

- [ ] **Step 3: Implement `cache.ts`**

```ts
// apps/web/src/lib/server/cache.ts
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function cacheControl(maxAgeSeconds: number, swrSeconds: number): string {
  return `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${swrSeconds}`;
}

export const CACHE_POEM = cacheControl(DAY, 7 * DAY);
export const CACHE_LIST = cacheControl(HOUR, DAY);
export const CACHE_INDEX = cacheControl(HOUR, DAY);
export const CACHE_SITEMAP = cacheControl(DAY, 7 * DAY);
export const CACHE_NONE = 'no-store';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/cache.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/server/cache.ts apps/web/src/lib/server/cache.test.ts
git commit --no-verify -m "feat(web): add Cache-Control constants for SSR routes"
```

---

## Task 3: Add `parsePageParam` (keep `generatePageNumbers` for now)

**Files:**
- Modify: `apps/web/src/lib/page-numbers.ts`
- Create: `apps/web/src/lib/page-numbers.test.ts`

`generatePageNumbers` is still imported by the not-yet-converted paginated pages, so it stays until Task 15. We add the new parser additively.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/page-numbers.test.ts
import { describe, expect, it } from 'vitest';
import { parsePageParam } from './page-numbers';

describe('parsePageParam', () => {
  it('parses a positive integer string', () => {
    expect(parsePageParam('1')).toBe(1);
    expect(parsePageParam('42')).toBe(42);
  });
  it('returns null for undefined, non-numeric, zero, negative, or decimal', () => {
    expect(parsePageParam(undefined)).toBeNull();
    expect(parsePageParam('abc')).toBeNull();
    expect(parsePageParam('0')).toBeNull();
    expect(parsePageParam('-3')).toBeNull();
    expect(parsePageParam('1.5')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/page-numbers.test.ts`
Expected: FAIL — `parsePageParam is not a function`.

- [ ] **Step 3: Add `parsePageParam` to `page-numbers.ts`**

Append to `apps/web/src/lib/page-numbers.ts` (leave `generatePageNumbers` untouched):

```ts
/**
 * Parses a route `[page]` param. Returns null for anything that is not a
 * positive integer so callers can render a 404.
 */
export function parsePageParam(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/page-numbers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/page-numbers.ts apps/web/src/lib/page-numbers.test.ts
git commit --no-verify -m "feat(web): add parsePageParam for on-demand page routes"
```

---

## Task 4: Poem accessor

**Files:**
- Create: `apps/web/src/lib/server/poems.ts`
- Create: `apps/web/src/lib/server/poems.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/poems.test.ts
import { ORPCError } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poems: { getPoemBySlug: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoem } from './poems';

const getMock = apiServer.poems.getPoemBySlug as unknown as ReturnType<typeof vi.fn>;

const POEM = {
  title: 'قصيدة',
  slug: 'a-poem' as PoemSlug,
  verses: [['شطر', 'شطر']],
  verseCount: 1,
  sample: 'شطر',
  keywords: 'k',
  poet: { name: 'شاعر', slug: 'poet-x' },
  era: { name: 'الجاهلي', slug: 'jahili' },
  meter: { name: 'الطويل', slug: 'altaweel' },
  theme: { name: 'مدح', slug: 'theme-1' },
  relatedPoems: [],
};

describe('getPoem', () => {
  beforeEach(() => getMock.mockReset());

  it('returns the unwrapped poem on success', async () => {
    getMock.mockResolvedValue({ data: POEM });
    const result = await getPoem('a-poem' as PoemSlug);
    expect(result).toEqual(POEM);
    expect(getMock).toHaveBeenCalledWith({ slug: 'a-poem' });
  });

  it('returns null on NOT_FOUND', async () => {
    getMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoem('missing' as PoemSlug)).toBeNull();
  });

  it('rethrows unexpected errors', async () => {
    getMock.mockRejectedValue(new ORPCError('POEM_PARSE_ERROR', { defined: true, status: 500 }));
    await expect(getPoem('boom' as PoemSlug)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/poems.test.ts`
Expected: FAIL — `Failed to resolve import "./poems"`.

- [ ] **Step 3: Implement `poems.ts`**

```ts
// apps/web/src/lib/server/poems.ts
import { isDefinedError, safe } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Poem = ApiOutputs['poems']['getPoemBySlug']['data'];

export async function getPoem(slug: PoemSlug): Promise<Poem | null> {
  const { error, data } = await safe(apiServer.poems.getPoemBySlug({ slug }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  return data.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/poems.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/server/poems.ts apps/web/src/lib/server/poems.test.ts
git commit --no-verify -m "feat(web): add SSR poem accessor"
```

---

## Task 5: Collection accessors (eras / meters / rhymes / themes)

**Files:**
- Create: `apps/web/src/lib/server/collections.ts`
- Create: `apps/web/src/lib/server/collections.test.ts`

Note the type asymmetry from the contract: `eras/meters/rhymes.list` return `slugWithCounts` (`{ name, slug, poemsCount, poetsCount }`); `themes.list` returns `slugWithPoemCount` (`{ name, slug, poemsCount }`); every `*.listPoems` `meta` is `slugWithPoemCount`. We derive all of these from `ApiOutputs` so they cannot drift.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/collections.test.ts
import { ORPCError } from '@orpc/client';
import type { EraSlug, MeterSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: {
    eras: { list: vi.fn(), listPoems: vi.fn() },
    meters: { list: vi.fn(), listPoems: vi.fn() },
    rhymes: { list: vi.fn(), listPoems: vi.fn() },
    themes: { list: vi.fn(), listPoems: vi.fn() },
  },
}));

import { apiServer } from './client';
import { allEras, getEraPoemsPage, getMeterPoemsPage } from './collections';

const erasListMock = apiServer.eras.list as unknown as ReturnType<typeof vi.fn>;
const eraPoemsMock = apiServer.eras.listPoems as unknown as ReturnType<typeof vi.fn>;
const meterPoemsMock = apiServer.meters.listPoems as unknown as ReturnType<typeof vi.fn>;

const POEM = { title: 'ت', slug: 'p1', poet: { name: 'ش', slug: 'poet-x' }, meter: { name: 'م', slug: 'meter-x' } };
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };

beforeEach(() => {
  erasListMock.mockReset();
  eraPoemsMock.mockReset();
  meterPoemsMock.mockReset();
});

describe('allEras', () => {
  it('returns the list data', async () => {
    erasListMock.mockResolvedValue({
      data: [{ name: 'الجاهلي', slug: 'jahili', poemsCount: 31, poetsCount: 12 }],
      pagination: PAGINATION,
    });
    const eras = await allEras();
    expect(eras).toHaveLength(1);
    expect(eras[0]?.poetsCount).toBe(12);
  });
});

describe('getEraPoemsPage', () => {
  it('maps data/meta/pagination', async () => {
    eraPoemsMock.mockResolvedValue({
      data: [POEM],
      pagination: PAGINATION,
      meta: { name: 'الجاهلي', slug: 'jahili', poemsCount: 31 },
    });
    const result = await getEraPoemsPage('jahili' as EraSlug, 1);
    expect(result?.poems).toHaveLength(1);
    expect(result?.era.slug).toBe('jahili');
    expect(result?.pagination.totalPages).toBe(1);
  });

  it('returns null on NOT_FOUND (unknown slug)', async () => {
    eraPoemsMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getEraPoemsPage('missing' as EraSlug, 1)).toBeNull();
  });

  it('returns null when page is past the last page', async () => {
    eraPoemsMock.mockResolvedValue({
      data: [], pagination: { page: 99, pageSize: 30, totalPages: 2, totalItems: 31 },
      meta: { name: 'الجاهلي', slug: 'jahili', poemsCount: 31 },
    });
    expect(await getEraPoemsPage('jahili' as EraSlug, 99)).toBeNull();
  });
});

describe('getMeterPoemsPage', () => {
  it('maps meter meta', async () => {
    meterPoemsMock.mockResolvedValue({
      data: [POEM], pagination: PAGINATION, meta: { name: 'البسيط', slug: 'albasit', poemsCount: 31 },
    });
    const result = await getMeterPoemsPage('albasit' as MeterSlug, 1);
    expect(result?.meter.slug).toBe('albasit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/collections.test.ts`
Expected: FAIL — `Failed to resolve import "./collections"`.

- [ ] **Step 3: Implement `collections.ts`**

```ts
// apps/web/src/lib/server/collections.ts
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
): Promise<{ poems: EraPoems['data']; era: EraPoems['meta']; pagination: EraPoems['pagination'] } | null> {
  const { error, data } = await safe(apiServer.eras.listPoems({ slug, page }));
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
): Promise<{ poems: MeterPoems['data']; meter: MeterPoems['meta']; pagination: MeterPoems['pagination'] } | null> {
  const { error, data } = await safe(apiServer.meters.listPoems({ slug, page }));
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
): Promise<{ poems: RhymePoems['data']; rhyme: RhymePoems['meta']; pagination: RhymePoems['pagination'] } | null> {
  const { error, data } = await safe(apiServer.rhymes.listPoems({ slug, page }));
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
): Promise<{ poems: ThemePoems['data']; theme: ThemePoems['meta']; pagination: ThemePoems['pagination'] } | null> {
  const { error, data } = await safe(apiServer.themes.listPoems({ slug, page }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, theme: data.meta, pagination: data.pagination };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/collections.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/server/collections.ts apps/web/src/lib/server/collections.test.ts
git commit --no-verify -m "feat(web): add SSR collection accessors"
```

---

## Task 6: Poets accessors

**Files:**
- Create: `apps/web/src/lib/server/poets.ts`
- Create: `apps/web/src/lib/server/poets.test.ts`

`poets.list` 404s for an out-of-range page (the API returns `NOT_FOUND` "No poets found for this page"), so `getPoetsPage` relies on the `NOT_FOUND → null` mapping.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/poets.test.ts
import { ORPCError } from '@orpc/client';
import type { PoetSlug } from '@qafiyah/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiServer: { poets: { list: vi.fn(), listPoems: vi.fn() } },
}));

import { apiServer } from './client';
import { getPoetPoemsPage, getPoetsPage } from './poets';

const listMock = apiServer.poets.list as unknown as ReturnType<typeof vi.fn>;
const poemsMock = apiServer.poets.listPoems as unknown as ReturnType<typeof vi.fn>;
const PAGINATION = { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 };

beforeEach(() => { listMock.mockReset(); poemsMock.mockReset(); });

describe('getPoetsPage', () => {
  it('maps poets + pagination', async () => {
    listMock.mockResolvedValue({ data: [{ name: 'ش', slug: 'poet-x', poemsCount: 3 }], pagination: PAGINATION });
    const result = await getPoetsPage(1);
    expect(result?.poets).toHaveLength(1);
    expect(result?.pagination.totalItems).toBe(1);
  });
  it('returns null on NOT_FOUND (page out of range)', async () => {
    listMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoetsPage(999)).toBeNull();
  });
});

describe('getPoetPoemsPage', () => {
  it('maps poems/poet/pagination', async () => {
    poemsMock.mockResolvedValue({
      data: [{ title: 'ت', slug: 'p1', poet: { name: 'ش', slug: 'poet-x' }, meter: { name: 'م', slug: 'meter-x' } }],
      pagination: PAGINATION,
      meta: { name: 'ش', slug: 'poet-x', poemsCount: 3 },
    });
    const result = await getPoetPoemsPage('poet-x' as PoetSlug, 1);
    expect(result?.poet.slug).toBe('poet-x');
    expect(result?.poems).toHaveLength(1);
  });
  it('returns null on NOT_FOUND', async () => {
    poemsMock.mockRejectedValue(new ORPCError('NOT_FOUND', { defined: true, status: 404 }));
    expect(await getPoetPoemsPage('missing' as PoetSlug, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/poets.test.ts`
Expected: FAIL — `Failed to resolve import "./poets"`.

- [ ] **Step 3: Implement `poets.ts`**

```ts
// apps/web/src/lib/server/poets.ts
import { isDefinedError, safe } from '@orpc/client';
import type { PoetSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type PoetsList = ApiOutputs['poets']['list'];
type PoetPoems = ApiOutputs['poets']['listPoems'];

export async function getPoetsPage(
  page: number
): Promise<{ poets: PoetsList['data']; pagination: PoetsList['pagination'] } | null> {
  const { error, data } = await safe(apiServer.poets.list({ page }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  return { poets: data.data, pagination: data.pagination };
}

export async function getPoetPoemsPage(
  slug: PoetSlug,
  page: number
): Promise<{ poems: PoetPoems['data']; poet: PoetPoems['meta']; pagination: PoetPoems['pagination'] } | null> {
  const { error, data } = await safe(apiServer.poets.listPoems({ slug, page }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, poet: data.meta, pagination: data.pagination };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/poets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/server/poets.ts apps/web/src/lib/server/poets.test.ts
git commit --no-verify -m "feat(web): add SSR poets accessors"
```

---

## Task 7: Sitemap XML builders

**Files:**
- Create: `apps/web/src/lib/server/sitemap.ts`
- Create: `apps/web/src/lib/server/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/server/sitemap.test.ts
import { describe, expect, it } from 'vitest';
import { SITEMAP_POEMS_PER_SHARD, shardCount, sitemapIndexXml, urlsetXml } from './sitemap';

describe('urlsetXml', () => {
  it('wraps locs in a urlset', () => {
    const xml = urlsetXml(['https://qafiyah.com/poems/a', 'https://qafiyah.com/poems/b']);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<url><loc>https://qafiyah.com/poems/a</loc></url>');
    expect(xml).toContain('<url><loc>https://qafiyah.com/poems/b</loc></url>');
  });
});

describe('sitemapIndexXml', () => {
  it('lists child sitemap URLs under PROD_SITE_URL', () => {
    const xml = sitemapIndexXml(['/sitemap/poems/1.xml', '/sitemap/poets.xml']);
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('<sitemap><loc>https://qafiyah.com/sitemap/poems/1.xml</loc></sitemap>');
    expect(xml).toContain('<sitemap><loc>https://qafiyah.com/sitemap/poets.xml</loc></sitemap>');
  });
});

describe('shardCount', () => {
  it('is at least 1', () => expect(shardCount(0, SITEMAP_POEMS_PER_SHARD)).toBe(1));
  it('ceils to the shard size', () => {
    expect(shardCount(SITEMAP_POEMS_PER_SHARD, SITEMAP_POEMS_PER_SHARD)).toBe(1);
    expect(shardCount(SITEMAP_POEMS_PER_SHARD + 1, SITEMAP_POEMS_PER_SHARD)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/lib/server/sitemap.test.ts`
Expected: FAIL — `Failed to resolve import "./sitemap"`.

- [ ] **Step 3: Implement `sitemap.ts`**

```ts
// apps/web/src/lib/server/sitemap.ts
import { PROD_SITE_URL } from '@qafiyah/constants';

// Sitemap protocol caps a file at 50,000 URLs. 45k leaves headroom.
export const SITEMAP_POEMS_PER_SHARD = 45_000;

export function shardCount(total: number, perShard: number): number {
  return Math.max(1, Math.ceil(total / perShard));
}

// Slugs are URL-safe (lowercase ASCII + hyphens), so no XML entity escaping is required.
export function urlsetXml(locs: readonly string[]): string {
  const body = locs.map((loc) => `<url><loc>${loc}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function sitemapIndexXml(sitemapPaths: readonly string[]): string {
  const body = sitemapPaths
    .map((path) => `<sitemap><loc>${PROD_SITE_URL}${path}</loc></sitemap>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/lib/server/sitemap.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole web unit suite (Phase 1 green checkpoint)**

Run: `cd apps/web && bunx vitest run`
Expected: PASS — all existing tests plus the new `src/lib/server/*` and `page-numbers` tests. (The old `src/lib/data/*` tests still pass; they are removed in Task 15.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/server/sitemap.ts apps/web/src/lib/server/sitemap.test.ts
git commit --no-verify -m "feat(web): add sitemap XML builders"
```

---

# Phase 2 — Cutover (full `astro build` is red until Task 16; `vitest` stays green)

## Task 8: Switch Astro to server output + Node adapter

**Files:**
- Modify: `apps/web/astro.config.mjs`
- Modify: `apps/web/package.json` (deps only — scripts change in Task 15)

- [ ] **Step 1: Add the adapter, remove the sitemap integration dependency**

```bash
cd apps/web
bun add @astrojs/node@^10.1.1
bun remove @astrojs/sitemap
```

- [ ] **Step 2: Rewrite `astro.config.mjs`**

```js
// apps/web/astro.config.mjs
import node from '@astrojs/node';
import react from '@astrojs/react';
import { PROD_SITE_URL } from '@qafiyah/constants';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: PROD_SITE_URL,
  integrations: [react()],
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Verify the adapter resolves and the config is valid**

Run: `cd apps/web && bunx astro sync`
Expected: completes without an adapter/config error (it generates `.astro/types.d.ts`). Page-level `getStaticPaths` errors do NOT appear here — `astro sync` does not run the full build.

- [ ] **Step 4: Confirm unit tests still pass**

Run: `cd apps/web && bunx vitest run`
Expected: PASS (unchanged from Task 7).

- [ ] **Step 5: Commit**

```bash
git add apps/web/astro.config.mjs apps/web/package.json bun.lock
git commit --no-verify -m "feat(web): switch Astro to server output with node adapter"
```

> From here until Task 16, `astro build` will fail on the unconverted pages. That is expected; convert pages in Tasks 9–14, then verify the build in Task 16.

---

## Task 9: Convert the dataless pages (home + 404)

**Files:**
- Modify: `apps/web/src/pages/index.astro`
- Modify: `apps/web/src/pages/404.astro`

These have no data dependency. `index.astro` just adds a cache header; `404.astro` sets a 404 status (so both the SSR fallback for unmatched routes and the explicit `Astro.rewrite('/404')` from dynamic pages produce a real 404) and is uncacheable.

- [ ] **Step 1: Add a cache header to `index.astro`**

In `apps/web/src/pages/index.astro`, add to the **end** of the frontmatter (after the `jsonLd` const, before the closing `---`):

```ts
import { CACHE_INDEX } from '@/lib/server/cache';

Astro.response.headers.set('Cache-Control', CACHE_INDEX);
```

(Place the `import` with the other imports at the top; the `Astro.response` line at the bottom of the frontmatter. The `<Layout>…</Layout>` body is unchanged.)

- [ ] **Step 2: Set status + no-store on `404.astro`**

Replace the frontmatter of `apps/web/src/pages/404.astro` with:

```astro
---
import { NOT_FOUND_CODE, NOT_FOUND_MESSAGE_AR, NOT_FOUND_TITLE } from '@/constants';
import Layout from '@/layouts/layout.astro';
import { CACHE_NONE } from '@/lib/server/cache';

Astro.response.status = 404;
Astro.response.headers.set('Cache-Control', CACHE_NONE);
---
```

(The `<Layout>…</Layout>` body is unchanged.)

- [ ] **Step 3: Smoke the two routes in dev**

Run (the API must be up — `bun run db:setup` then `bun --filter @qafiyah/api run dev` in another shell, or the full `bun run dev`):

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost:4321/
curl -s -o /dev/null -w "/no-such-path -> %{http_code}\n" http://localhost:4321/no-such-path
pkill -f 'astro dev' || true
```

Expected: `/ -> 200`; `/no-such-path -> 404`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/index.astro apps/web/src/pages/404.astro
git commit --no-verify -m "feat(web): render home and 404 on-demand"
```

---

## Task 10: Convert the poem page

**Files:**
- Modify: `apps/web/src/pages/poems/[slug].astro`

- [ ] **Step 1: Replace the frontmatter**

Replace the entire frontmatter (the block between the leading `---` and the second `---`) of `apps/web/src/pages/poems/[slug].astro` with:

```astro
---
import type { PoemSlug } from '@qafiyah/contracts';
import { PoemDisplay } from '@/components/poem-display';
import Layout from '@/layouts/layout.astro';
import { buildPoemPage } from '@/lib/poem-page';
import { CACHE_POEM } from '@/lib/server/cache';
import { getPoem } from '@/lib/server/poems';

const { slug } = Astro.params;
const detail = slug ? await getPoem(slug as PoemSlug) : null;
if (!detail) return Astro.rewrite('/404');

Astro.response.headers.set('Cache-Control', CACHE_POEM);
const { poem, layout } = buildPoemPage(detail, slug as PoemSlug);
---
```

(The `<Layout … ><PoemDisplay … /></Layout>` body is unchanged. `buildPoemPage` is unchanged — its `Poem` type is structurally identical to the accessor's return.)

- [ ] **Step 2: Smoke the route in dev**

Run (API up, as in Task 9):

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
# Replace <real-slug> with a slug you know exists (e.g. from curl http://localhost:8787/v1/poems/slugs | head):
curl -s -o /dev/null -w "valid -> %{http_code}\n" "http://localhost:4321/poems/<real-slug>"
curl -s -o /dev/null -w "missing -> %{http_code}\n" "http://localhost:4321/poems/definitely-not-a-real-slug"
pkill -f 'astro dev' || true
```

Expected: valid → `200`; missing → `404`. (If "missing" returns 200, see the contingency note at the end of Task 13.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/poems/[slug].astro
git commit --no-verify -m "feat(web): render poem pages on-demand via API"
```

---

## Task 11: Convert the collection index pages (eras / meters / rhymes / themes)

**Files:**
- Modify: `apps/web/src/pages/eras/index.astro`
- Modify: `apps/web/src/pages/meters/index.astro`
- Modify: `apps/web/src/pages/rhymes/index.astro`
- Modify: `apps/web/src/pages/themes/index.astro`

Each change is the same shape: swap the `@/lib/data/collections` import for `@/lib/server/collections`, `await` the accessor, and set `CACHE_INDEX`. The `<Layout>…</Layout>` body of each file is unchanged.

- [ ] **Step 1: `eras/index.astro`** — change the import line and the data line, add the cache header:

Change `import { allEras } from '@/lib/data/collections';` to:
```ts
import { allEras } from '@/lib/server/collections';
import { CACHE_INDEX } from '@/lib/server/cache';
```
Change `const eras = allEras();` to:
```ts
const eras = await allEras();
Astro.response.headers.set('Cache-Control', CACHE_INDEX);
```

- [ ] **Step 2: `meters/index.astro`** — same transformation:

Change `import { allMeters } from '@/lib/data/collections';` to:
```ts
import { allMeters } from '@/lib/server/collections';
import { CACHE_INDEX } from '@/lib/server/cache';
```
Change `const meters = allMeters();` to:
```ts
const meters = await allMeters();
Astro.response.headers.set('Cache-Control', CACHE_INDEX);
```

- [ ] **Step 3: `rhymes/index.astro`** — same transformation:

Change `import { allRhymes } from '@/lib/data/collections';` to:
```ts
import { allRhymes } from '@/lib/server/collections';
import { CACHE_INDEX } from '@/lib/server/cache';
```
Change `const rhymes = allRhymes();` to:
```ts
const rhymes = await allRhymes();
Astro.response.headers.set('Cache-Control', CACHE_INDEX);
```

- [ ] **Step 4: `themes/index.astro`** — same transformation:

Change `import { allThemes } from '@/lib/data/collections';` to:
```ts
import { allThemes } from '@/lib/server/collections';
import { CACHE_INDEX } from '@/lib/server/cache';
```
Change `const themes = allThemes();` to:
```ts
const themes = await allThemes();
Astro.response.headers.set('Cache-Control', CACHE_INDEX);
```

- [ ] **Step 5: Smoke the four index routes in dev**

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
for p in eras meters rhymes themes; do
  curl -s -o /dev/null -w "/$p -> %{http_code}\n" "http://localhost:4321/$p"
done
pkill -f 'astro dev' || true
```

Expected: all four → `200`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/eras/index.astro apps/web/src/pages/meters/index.astro apps/web/src/pages/rhymes/index.astro apps/web/src/pages/themes/index.astro
git commit --no-verify -m "feat(web): render collection index pages on-demand"
```

---

## Task 12: Convert the collection paginated pages

**Files:**
- Modify: `apps/web/src/pages/eras/[slug]/page/[page].astro`
- Modify: `apps/web/src/pages/meters/[slug]/page/[page].astro`
- Modify: `apps/web/src/pages/rhymes/[slug]/page/[page].astro`
- Modify: `apps/web/src/pages/themes/[slug]/page/[page].astro`

For each file: remove the `getStaticPaths` block and the `Astro.props` destructure, and replace them with a param-parse + `await` accessor + 404 + cache header. All downstream frontmatter (title, description, JSON-LD) and the `<Layout>…</Layout>` body are **unchanged** — they read the same `poems`, `<entity>`, `pagination` locals.

- [ ] **Step 1: `eras/[slug]/page/[page].astro`**

Remove these existing imports:
```ts
import type { GetStaticPaths } from 'astro';
import { generatePageNumbers } from '@/lib/page-numbers';
import { allEras, getEraPoemsPage } from '@/lib/data/collections';
```
Add these imports:
```ts
import type { EraSlug } from '@qafiyah/contracts';
import { CACHE_LIST } from '@/lib/server/cache';
import { getEraPoemsPage } from '@/lib/server/collections';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the whole `export const getStaticPaths = (() => { … }) satisfies GetStaticPaths;` block AND the `const { poems, era, pagination } = Astro.props as Awaited<…>['props'];` line with:
```ts
const page = parsePageParam(Astro.params.page);
const slugParam = Astro.params.slug;
const data = page === null || !slugParam ? null : await getEraPoemsPage(slugParam as EraSlug, page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poems, era, pagination } = data;
```

(Everything below — `const slug = era.slug;`, `pageNumber`, JSON-LD, the `<Layout>` body — is unchanged.)

- [ ] **Step 2: `meters/[slug]/page/[page].astro`**

Remove:
```ts
import type { GetStaticPaths } from 'astro';
import { generatePageNumbers } from '@/lib/page-numbers';
import { allMeters, getMeterPoemsPage } from '@/lib/data/collections';
```
Add:
```ts
import type { MeterSlug } from '@qafiyah/contracts';
import { CACHE_LIST } from '@/lib/server/cache';
import { getMeterPoemsPage } from '@/lib/server/collections';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the `getStaticPaths` block and the `const { poems, meter, pagination } = Astro.props …` line with:
```ts
const page = parsePageParam(Astro.params.page);
const slugParam = Astro.params.slug;
const data = page === null || !slugParam ? null : await getMeterPoemsPage(slugParam as MeterSlug, page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poems, meter, pagination } = data;
```

- [ ] **Step 3: `rhymes/[slug]/page/[page].astro`**

Remove:
```ts
import type { GetStaticPaths } from 'astro';
import { generatePageNumbers } from '@/lib/page-numbers';
import { allRhymes, getRhymePoemsPage } from '@/lib/data/collections';
```
Add:
```ts
import type { RhymeSlug } from '@qafiyah/contracts';
import { CACHE_LIST } from '@/lib/server/cache';
import { getRhymePoemsPage } from '@/lib/server/collections';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the `getStaticPaths` block and the `const { poems, rhyme, pagination } = Astro.props …` line with:
```ts
const page = parsePageParam(Astro.params.page);
const slugParam = Astro.params.slug;
const data = page === null || !slugParam ? null : await getRhymePoemsPage(slugParam as RhymeSlug, page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poems, rhyme, pagination } = data;
```

- [ ] **Step 4: `themes/[slug]/page/[page].astro`**

Remove:
```ts
import type { GetStaticPaths } from 'astro';
import { generatePageNumbers } from '@/lib/page-numbers';
import { allThemes, getThemePoemsPage } from '@/lib/data/collections';
```
Add:
```ts
import type { ThemeSlug } from '@qafiyah/contracts';
import { CACHE_LIST } from '@/lib/server/cache';
import { getThemePoemsPage } from '@/lib/server/collections';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the `getStaticPaths` block and the `const { poems, theme, pagination } = Astro.props …` line with:
```ts
const page = parsePageParam(Astro.params.page);
const slugParam = Astro.params.slug;
const data = page === null || !slugParam ? null : await getThemePoemsPage(slugParam as ThemeSlug, page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poems, theme, pagination } = data;
```

- [ ] **Step 5: Smoke the paginated routes in dev**

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
# Use real slugs from the API, e.g. curl http://localhost:8787/v1/eras to find one.
curl -s -o /dev/null -w "era p1 -> %{http_code}\n" "http://localhost:4321/eras/<era-slug>/page/1"
curl -s -o /dev/null -w "era p9999 -> %{http_code}\n" "http://localhost:4321/eras/<era-slug>/page/9999"
curl -s -o /dev/null -w "era bad-slug -> %{http_code}\n" "http://localhost:4321/eras/nope/page/1"
pkill -f 'astro dev' || true
```

Expected: page 1 → `200`; page 9999 → `404`; bad slug → `404`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/eras/[slug]/page/[page].astro apps/web/src/pages/meters/[slug]/page/[page].astro apps/web/src/pages/rhymes/[slug]/page/[page].astro apps/web/src/pages/themes/[slug]/page/[page].astro
git commit --no-verify -m "feat(web): render collection paginated pages on-demand"
```

---

## Task 13: Convert the poets pages

**Files:**
- Modify: `apps/web/src/pages/poets/page/[page].astro`
- Modify: `apps/web/src/pages/poets/[slug]/page/[page].astro`

- [ ] **Step 1: `poets/page/[page].astro`**

Remove:
```ts
import type { GetStaticPaths } from 'astro';
import { allPoets, getPoetsPage } from '@/lib/data/poets';
```
Add:
```ts
import { CACHE_LIST } from '@/lib/server/cache';
import { getPoetsPage } from '@/lib/server/poets';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the `getStaticPaths` block AND the `const { poets, pagination } = Astro.props …` line with:
```ts
const page = parsePageParam(Astro.params.page);
const data = page === null ? null : await getPoetsPage(page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poets, pagination } = data;
```

(Everything below — `pageNumber`, `totalPoets`, the `CAT_POET_PREFIX_REGEX` slug stripping in JSON-LD and links, the `<Layout>` body — is unchanged.)

- [ ] **Step 2: `poets/[slug]/page/[page].astro`**

Remove:
```ts
import type { GetStaticPaths } from 'astro';
import { allPoets, getPoetPoemsPage } from '@/lib/data/poets';
import { generatePageNumbers } from '@/lib/page-numbers';
```
Add:
```ts
import type { PoetSlug } from '@qafiyah/contracts';
import { CACHE_LIST } from '@/lib/server/cache';
import { getPoetPoemsPage } from '@/lib/server/poets';
import { parsePageParam } from '@/lib/page-numbers';
```
Replace the `getStaticPaths` block AND the `const { poems, poet, pagination } = Astro.props …` line with:
```ts
const page = parsePageParam(Astro.params.page);
const slugParam = Astro.params.slug;
const data = page === null || !slugParam ? null : await getPoetPoemsPage(slugParam as PoetSlug, page);
if (!data) return Astro.rewrite('/404');
Astro.response.headers.set('Cache-Control', CACHE_LIST);
const { poems, poet, pagination } = data;
```

(Everything below — `const slug = poet.slug;`, the JSON-LD, the `<Layout>` body — is unchanged.)

- [ ] **Step 3: Smoke the poets routes in dev**

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
curl -s -o /dev/null -w "poets p1 -> %{http_code}\n" "http://localhost:4321/poets/page/1"
curl -s -o /dev/null -w "poets p99999 -> %{http_code}\n" "http://localhost:4321/poets/page/99999"
# Use a real poet slug from curl http://localhost:8787/v1/poets
curl -s -o /dev/null -w "poet p1 -> %{http_code}\n" "http://localhost:4321/poets/<poet-slug>/page/1"
pkill -f 'astro dev' || true
```

Expected: poets page 1 → `200`; page 99999 → `404`; a real poet page → `200`.

> **404 contingency:** if any "missing" smoke above returns `200` instead of `404`, `Astro.rewrite('/404')` is not carrying the 404 status on this Astro version. Fix: in each dynamic page, replace `if (!data) return Astro.rewrite('/404');` with `if (!data) { Astro.response.status = 404; return Astro.rewrite('/404'); }`. Re-run the smoke; the explicit status set on the responding context fixes it. (404.astro already sets `Astro.response.status = 404` from Task 9, which is the primary mechanism.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/poets/page/[page].astro apps/web/src/pages/poets/[slug]/page/[page].astro
git commit --no-verify -m "feat(web): render poets pages on-demand"
```

---

## Task 14: Dynamic sitemap routes

**Files:**
- Create: `apps/web/src/pages/sitemap-index.xml.ts`
- Create: `apps/web/src/pages/sitemap/poems/[page].xml.ts`
- Create: `apps/web/src/pages/sitemap/poets.xml.ts`
- Create: `apps/web/src/pages/sitemap/collections.xml.ts`

These are Astro endpoints (route params: `[page].xml.ts` exposes `params.page`). `robots.txt` already points to `/sitemap-index.xml`.

- [ ] **Step 1: `sitemap-index.xml.ts`**

```ts
// apps/web/src/pages/sitemap-index.xml.ts
import type { APIRoute } from 'astro';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { SITEMAP_POEMS_PER_SHARD, shardCount, sitemapIndexXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const slugs = await apiServer.poems.listPoemSlugs();
  const poemShards = shardCount(slugs.data.length, SITEMAP_POEMS_PER_SHARD);
  const paths = [
    ...Array.from({ length: poemShards }, (_, i) => `/sitemap/poems/${i + 1}.xml`),
    '/sitemap/poets.xml',
    '/sitemap/collections.xml',
  ];
  return new Response(sitemapIndexXml(paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
```

- [ ] **Step 2: `sitemap/poems/[page].xml.ts`**

```ts
// apps/web/src/pages/sitemap/poems/[page].xml.ts
import type { APIRoute } from 'astro';
import { PROD_SITE_URL } from '@qafiyah/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { parsePageParam } from '@/lib/page-numbers';
import { SITEMAP_POEMS_PER_SHARD, urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async ({ params }) => {
  const page = parsePageParam(params.page);
  if (page === null) return new Response('Not found', { status: 404 });
  const slugs = await apiServer.poems.listPoemSlugs();
  const start = (page - 1) * SITEMAP_POEMS_PER_SHARD;
  const slice = slugs.data.slice(start, start + SITEMAP_POEMS_PER_SHARD);
  if (slice.length === 0) return new Response('Not found', { status: 404 });
  const locs = slice.map((slug) => `${PROD_SITE_URL}/poems/${slug}`);
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
```

- [ ] **Step 3: `sitemap/poets.xml.ts`** (loops the paginated poets list; strips the `cat-poet-` prefix to match the on-site links)

```ts
// apps/web/src/pages/sitemap/poets.xml.ts
import { isDefinedError, safe } from '@orpc/client';
import type { APIRoute } from 'astro';
import { PROD_SITE_URL } from '@qafiyah/constants';
import { CAT_POET_PREFIX_REGEX } from '@/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { apiServer } from '@/lib/server/client';
import { urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const locs: string[] = [];
  let page = 1;
  // Poets are in the low thousands → a handful of 30-item pages. Cached 24h.
  while (true) {
    const { error, data } = await safe(apiServer.poets.list({ page }));
    if (error) {
      if (isDefinedError(error) && error.code === 'NOT_FOUND') break;
      throw error;
    }
    for (const poet of data.data) {
      const slug = String(poet.slug).toLowerCase().replace(CAT_POET_PREFIX_REGEX, '');
      locs.push(`${PROD_SITE_URL}/poets/${slug}/page/1`);
    }
    if (page >= data.pagination.totalPages) break;
    page += 1;
  }
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
```

- [ ] **Step 4: `sitemap/collections.xml.ts`**

```ts
// apps/web/src/pages/sitemap/collections.xml.ts
import type { APIRoute } from 'astro';
import { PROD_SITE_URL } from '@qafiyah/constants';
import { CACHE_SITEMAP } from '@/lib/server/cache';
import { allEras, allMeters, allRhymes, allThemes } from '@/lib/server/collections';
import { urlsetXml } from '@/lib/server/sitemap';

export const GET: APIRoute = async () => {
  const [eras, meters, rhymes, themes] = await Promise.all([
    allEras(),
    allMeters(),
    allRhymes(),
    allThemes(),
  ]);
  const locs = [
    `${PROD_SITE_URL}/`,
    `${PROD_SITE_URL}/eras`,
    `${PROD_SITE_URL}/meters`,
    `${PROD_SITE_URL}/rhymes`,
    `${PROD_SITE_URL}/themes`,
    `${PROD_SITE_URL}/poets/page/1`,
    ...eras.map((e) => `${PROD_SITE_URL}/eras/${e.slug}/page/1`),
    ...meters.map((m) => `${PROD_SITE_URL}/meters/${m.slug}/page/1`),
    ...rhymes.map((r) => `${PROD_SITE_URL}/rhymes/${r.slug}/page/1`),
    ...themes.map((t) => `${PROD_SITE_URL}/themes/${t.slug}/page/1`),
  ];
  return new Response(urlsetXml(locs), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': CACHE_SITEMAP },
  });
};
```

- [ ] **Step 5: Smoke the sitemaps in dev**

```bash
cd apps/web && (bunx astro dev --port 4321 &) ; sleep 4
curl -s -o /dev/null -w "index -> %{http_code}\n" http://localhost:4321/sitemap-index.xml
curl -s http://localhost:4321/sitemap-index.xml | head -c 300; echo
curl -s -o /dev/null -w "poems/1 -> %{http_code}\n" http://localhost:4321/sitemap/poems/1.xml
curl -s -o /dev/null -w "poets -> %{http_code}\n" http://localhost:4321/sitemap/poets.xml
curl -s -o /dev/null -w "collections -> %{http_code}\n" http://localhost:4321/sitemap/collections.xml
pkill -f 'astro dev' || true
```

Expected: all `200`; the index body is `<sitemapindex>` XML listing the shards.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/sitemap-index.xml.ts apps/web/src/pages/sitemap/poems/[page].xml.ts apps/web/src/pages/sitemap/poets.xml.ts apps/web/src/pages/sitemap/collections.xml.ts
git commit --no-verify -m "feat(web): add dynamic cached sitemap routes"
```

---

## Task 15: Delete the snapshot/static machinery + update scripts/deps

**Files:**
- Delete: `apps/web/scripts/generate-snapshot.ts`, `apps/web/scripts/build.ts`
- Delete: `apps/web/src/lib/data/loader.ts`, `poems.ts`, `poets.ts`, `collections.ts` and their `.test.ts`
- Modify: `apps/web/src/lib/page-numbers.ts` (remove `generatePageNumbers`)
- Modify: `apps/web/package.json` (scripts + drop `@qafiyah/db`, `serve`)
- Modify: `knip.json` (web entry `generate-snapshot.ts` → `verify-seo.ts`)
- Modify: `.gitignore` (drop `apps/web/.data` entry if present)

- [ ] **Step 1: Delete the snapshot scripts and the snapshot data layer**

```bash
cd /Users/alwaleed.alqahani/Developer/qafiyah
git rm apps/web/scripts/generate-snapshot.ts apps/web/scripts/build.ts
git rm apps/web/src/lib/data/loader.ts apps/web/src/lib/data/loader.test.ts
git rm apps/web/src/lib/data/poems.ts apps/web/src/lib/data/poems.test.ts
git rm apps/web/src/lib/data/poets.ts apps/web/src/lib/data/poets.test.ts
git rm apps/web/src/lib/data/collections.ts apps/web/src/lib/data/collections.test.ts
```

- [ ] **Step 2: Remove `generatePageNumbers`**

Replace the entire contents of `apps/web/src/lib/page-numbers.ts` with just the parser (the only remaining export):

```ts
// apps/web/src/lib/page-numbers.ts
/**
 * Parses a route `[page]` param. Returns null for anything that is not a
 * positive integer so callers can render a 404.
 */
export function parsePageParam(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}
```

- [ ] **Step 3: Update `apps/web/package.json` scripts and dependencies**

In `scripts`, set:
```json
    "dev": "bun ../../scripts/check-port.ts 4321 && astro dev",
    "build": "astro build",
    "verify:seo": "bun ./scripts/verify-seo.ts",
    "start": "astro preview",
    "types": "tsc --noEmit",
    "lint": "astro check && biome check --write .",
    "format": "biome format --write .",
    "test": "vitest run"
```
(Remove the old `"build": "bun ./scripts/build.ts"`, `"build:raw"`, and `"serve"` script lines.)

In `devDependencies`, remove these two lines:
```json
    "@qafiyah/db": "workspace:*",
```
```json
    "serve": "^14.2.6",
```

- [ ] **Step 4: Update `knip.json` and the `.data` gitignore entry**

`knip.json` declares the `apps/web` entry as `scripts/generate-snapshot.ts`, which Step 1 deleted. Repoint it at the remaining standalone script (`verify-seo.ts`) — knip's Astro plugin auto-detects `src/pages/**` as entries, so the server lib is covered transitively. Change the `apps/web` workspace block in `knip.json` from:

```json
    "apps/web": {
      "entry": ["scripts/generate-snapshot.ts"]
    },
```

to:

```json
    "apps/web": {
      "entry": ["scripts/verify-seo.ts"]
    },
```

Then check and remove an `apps/web/.data` (or `.data/`) line from `.gitignore` if it exists:

Run: `grep -n "\.data" .gitignore apps/web/.gitignore 2>/dev/null || echo "no .data entry"`
If a line exists, delete just that line from the file it is in.

- [ ] **Step 5: Reinstall and confirm nothing imports the deleted modules**

```bash
cd /Users/alwaleed.alqahani/Developer/qafiyah
bun install
grep -rn "lib/data/\|generatePageNumbers\|scripts/build\|generate-snapshot\|@qafiyah/db" apps/web/src apps/web/scripts apps/web/astro.config.mjs apps/web/package.json || echo "OK: no references to deleted modules"
```
Expected: `OK: no references to deleted modules`.

- [ ] **Step 6: Unit tests still green**

Run: `cd apps/web && bunx vitest run`
Expected: PASS — the `src/lib/data/*` tests are gone; `src/lib/server/*`, `page-numbers`, and the existing `arabic`/`utils`/`flatten-verses` tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit --no-verify -m "refactor(web): delete DB snapshot pipeline and static data layer"
```

---

## Task 16: Full build + preview smoke + SEO verification

**Files:**
- Modify: `apps/web/scripts/verify-seo.ts`

The full `astro build` must now succeed (all pages converted). `verify-seo.ts` is reworked to crawl a running server instead of walking `dist/`.

- [ ] **Step 1: Rework `verify-seo.ts` to crawl a base URL**

Replace the contents of `apps/web/scripts/verify-seo.ts` with:

```ts
#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: verifier logs progress to the developer.

/**
 * Validates SEO invariants by fetching a representative URL per route template
 * from a running server (one URL per template proves the template). Set BASE_URL
 * and the sample slugs via env. Exits non-zero on any missing/invalid metadata.
 */

import { Result } from 'neverthrow';

const safeParseJson = Result.fromThrowable(
  (raw: string): unknown => JSON.parse(raw),
  (cause): { message: string } => ({ message: cause instanceof Error ? cause.message : String(cause) })
);

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:4321';
const POEM_SLUG = process.env['SEO_POEM_SLUG'];
const ERA_SLUG = process.env['SEO_ERA_SLUG'];
const POET_SLUG = process.env['SEO_POET_SLUG'];
const TITLE_MAX = 80;
const DESC_MIN = 60;
const DESC_MAX = 320;

const paths = ['/', '/eras', '/meters', '/rhymes', '/themes', '/poets/page/1', '/404'];
if (ERA_SLUG) paths.push(`/eras/${ERA_SLUG}/page/1`);
if (POET_SLUG) paths.push(`/poets/${POET_SLUG}/page/1`);
if (POEM_SLUG) paths.push(`/poems/${POEM_SLUG}`);

const RX = {
  title: /<title[^>]*>([\s\S]*?)<\/title>/i,
  desc: /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
  canonical: /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  ogImage: /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  ogType: /<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i,
  twitterCard: /<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i,
  h1: /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
  ld: /<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
};

const problems: string[] = [];

for (const path of paths) {
  const res = await fetch(`${BASE_URL}${path}`);
  const html = await res.text();
  const is404 = path === '/404';

  const title = RX.title.exec(html)?.[1]?.trim();
  if (!title) problems.push(`${path}: missing <title>`);
  else if (title.length > TITLE_MAX) problems.push(`${path}: <title> > ${TITLE_MAX} chars (${title.length})`);

  if (!is404) {
    const desc = RX.desc.exec(html)?.[1]?.trim();
    if (!desc) problems.push(`${path}: missing <meta description>`);
    else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      problems.push(`${path}: description length ${desc.length} not in [${DESC_MIN},${DESC_MAX}]`);
    }
    if (!RX.canonical.test(html)) problems.push(`${path}: missing canonical`);
    if (!RX.ogImage.test(html)) problems.push(`${path}: missing og:image`);
    if (!RX.ogType.test(html)) problems.push(`${path}: missing og:type`);
    const twCard = RX.twitterCard.exec(html)?.[1]?.trim();
    if (twCard !== 'summary_large_image') {
      problems.push(`${path}: twitter:card must be summary_large_image (got "${twCard ?? 'missing'}")`);
    }
    const h1s = [...html.matchAll(RX.h1)];
    if (h1s.length !== 1) problems.push(`${path}: expected 1 <h1>, got ${h1s.length}`);
  }

  for (const ldMatch of html.matchAll(RX.ld)) {
    const parsed = safeParseJson(ldMatch[1] ?? '');
    if (parsed.isErr()) problems.push(`${path}: invalid JSON-LD (${parsed.error.message})`);
  }
}

if (problems.length > 0) {
  console.error(`SEO regressions (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`SEO: all ${paths.length} sampled routes pass`);
```

- [ ] **Step 2: Run the full build (must succeed now)**

Run: `cd apps/web && bunx astro build`
Expected: build succeeds in seconds (no snapshot step), emitting `dist/server/entry.mjs` and `dist/client/`. `astro check` (run via `bun run lint` later) and `tsc` should be clean.

- [ ] **Step 3: Boot the built server under Bun and smoke it**

Run (API up on :8787):

```bash
cd apps/web
HOST=127.0.0.1 PORT=4321 INTERNAL_API_URL=http://localhost:8787 bun ./dist/server/entry.mjs &
sleep 3
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost:4321/
curl -s -o /dev/null -w "/eras -> %{http_code}\n" http://localhost:4321/eras
curl -s -o /dev/null -w "missing poem -> %{http_code}\n" http://localhost:4321/poems/definitely-not-real
curl -s -o /dev/null -w "sitemap -> %{http_code}\n" http://localhost:4321/sitemap-index.xml
kill %1 2>/dev/null || true
```

Expected: `/`→200, `/eras`→200, missing poem→404, sitemap→200. (Confirms `@astrojs/node` standalone runs under Bun.)

- [ ] **Step 4: Run SEO verification against the running server**

Run (server from Step 3 still up, or re-boot it; supply real sample slugs):

```bash
cd apps/web
BASE_URL=http://localhost:4321 \
  SEO_ERA_SLUG=<real-era-slug> SEO_POET_SLUG=<real-poet-slug> SEO_POEM_SLUG=<real-poem-slug> \
  bun ./scripts/verify-seo.ts
```

Expected: `SEO: all N sampled routes pass`.

- [ ] **Step 5: Type-check + lint the package**

Run: `cd apps/web && bun run types && bun run lint`
Expected: `tsc --noEmit` clean; `astro check` + biome clean (no references to removed modules, no unused exports).

- [ ] **Step 6: Commit**

```bash
git add apps/web/scripts/verify-seo.ts
git commit --no-verify -m "feat(web): verify SEO against the running SSR server"
```

---

# Phase 3 — Container & infrastructure

## Task 17: nginx as cache + static front

**Files:**
- Modify: `apps/web/nginx.conf` (rewritten as a full container config)

- [ ] **Step 1: Replace `apps/web/nginx.conf`**

```nginx
# Full nginx config for the web container: caches SSR HTML, serves built
# static assets from disk, and canonicalizes URLs. Proxies HTML to the Astro
# standalone server on 127.0.0.1:4321.
worker_processes auto;
events { worker_connections 1024; }

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  charset utf-8;
  charset_types
    text/plain text/css text/xml
    application/javascript application/json application/xml
    image/svg+xml;

  proxy_cache_path /var/cache/nginx/astro levels=1:2 keys_zone=astro:10m
                   max_size=1g inactive=24h use_temp_path=off;

  server {
    listen 80;
    listen [::]:80;
    server_name qafiyah.com www.qafiyah.com;
    root /app/dist/client;

    # Canonicalize www -> apex.
    if ($host = www.qafiyah.com) {
      return 301 $scheme://qafiyah.com$request_uri;
    }
    # Canonicalize trailing slash -> none (skips the root path).
    rewrite ^/(.+)/$ /$1 permanent;

    # Content-hashed assets: serve from disk, cache forever.
    location /_astro/ {
      expires 1y;
      add_header Cache-Control "public, immutable";
      try_files $uri =404;
    }

    # Static file from disk if it exists (favicon, fonts, robots.txt,
    # manifest, images); otherwise hand off to the SSR origin.
    location / {
      try_files $uri @astro;
    }

    location @astro {
      proxy_pass http://127.0.0.1:4321;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache astro;
      proxy_cache_key "$scheme$host$uri";          # path only — query never fragments/poisons cache
      proxy_cache_lock on;                          # collapse concurrent misses for the same key
      proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
      proxy_cache_background_update on;             # SWR: serve stale, refresh in background
      add_header X-Cache-Status $upstream_cache_status;
      # TTL is taken from the upstream Cache-Control the Astro page sets.
    }
  }
}
```

- [ ] **Step 2: Validate the config syntax with the nginx image**

Run: `docker run --rm -v "$PWD/apps/web/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t`
Expected: `syntax is ok` / `test is successful`. (The `proxy_cache_path` directory does not need to exist for `-t`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/nginx.conf
git commit --no-verify -m "feat(web): nginx proxy_cache + static front for SSR"
```

---

## Task 18: Web Dockerfile + entrypoint (Bun SSR server + nginx)

**Files:**
- Modify: `apps/web/Dockerfile`
- Create: `apps/web/docker-entrypoint.sh`

The build stage needs **no** `DATABASE_URL` (no snapshot). The serve stage runs both the Bun SSR server and nginx.

- [ ] **Step 1: Replace `apps/web/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
# Build context = repo root.

# --- Build stage: astro build (NO DB, NO snapshot) ---
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN cd apps/web && bun run build

# --- Serve stage: Bun SSR server + nginx ---
FROM oven/bun:1.3.14-alpine AS serve
RUN apk add --no-cache nginx tini && mkdir -p /var/cache/nginx/astro
WORKDIR /app
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV HOST=127.0.0.1 PORT=4321
EXPOSE 80
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
```

- [ ] **Step 2: Create `apps/web/docker-entrypoint.sh`**

```sh
#!/bin/sh
set -e
# Start the Astro standalone SSR server (origin), then nginx (front).
HOST="${HOST:-127.0.0.1}" PORT="${PORT:-4321}" bun /app/dist/server/entry.mjs &
exec nginx -g 'daemon off;'
```

- [ ] **Step 3: Build the image (no DB needed at build)**

Run (from repo root): `docker build -f apps/web/Dockerfile -t qafiyah-web:dev .`
Expected: build logs show `bun install`, then `astro build`, then the nginx serve stage. No `DATABASE_URL` involved. Build succeeds.

- [ ] **Step 4: Run the image against the host API and smoke it**

Run (API reachable — e.g. the api container or a local API on :8787; from inside the container reach the host via `host.docker.internal`):

```bash
docker run --rm -p 8080:80 \
  -e INTERNAL_API_URL="http://host.docker.internal:8787" \
  --name qafiyah-web-smoke qafiyah-web:dev &
sleep 4
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "/eras -> %{http_code}\n" http://localhost:8080/eras
curl -s -o /dev/null -w "/about/ (trailing) -> %{http_code}\n" http://localhost:8080/about/
curl -sI http://localhost:8080/ | grep -i x-cache-status
curl -sI http://localhost:8080/ | grep -i x-cache-status   # second hit
docker stop qafiyah-web-smoke
```

Expected: `/`→200, `/eras`→200, `/about/`→301 (trailing-slash redirect), and `X-Cache-Status` flips from `MISS` (first) to `HIT` (second).

- [ ] **Step 5: Commit**

```bash
git add apps/web/Dockerfile apps/web/docker-entrypoint.sh
git commit --no-verify -m "feat(web): multi-stage image running Bun SSR behind nginx"
```

---

## Task 19: Compose web service (no DB build arg; depends on api)

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace the `web` service block**

In `docker-compose.yml`, replace the existing `web` service with:

```yaml
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: qafiyah-web
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      api:
        condition: service_started
    environment:
      # SSR pages call the api service over the internal compose network.
      INTERNAL_API_URL: http://api:8787
    ports:
      - "80:80"
```

(The `build.args.DATABASE_URL` block is removed entirely — the web build no longer reads the DB.)

- [ ] **Step 2: Bring up the full stack**

```bash
cd /Users/alwaleed.alqahani/Developer/qafiyah
bun run db:setup
docker compose up -d --build
docker compose ps
```

Expected: `qafiyah-db` (healthy), `qafiyah-api`, `qafiyah-web` all running.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit --no-verify -m "feat: wire web SSR service to api over compose network"
```

---

## Task 20: Full-stack container smoke

**Files:** none (verification only)

- [ ] **Step 1: Verify the API still serves (unchanged)**

```bash
curl -s -o /dev/null -w "api / -> %{http_code}\n" http://localhost:8787/
curl -s http://localhost:8787/v1/poems/random | head -c 120; echo
```
Expected: `302`, then a JSON poem envelope.

- [ ] **Step 2: Verify the web container end to end**

```bash
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "/eras -> %{http_code}\n" http://localhost/eras
curl -s -o /dev/null -w "www -> %{http_code}\n" -H "Host: www.qafiyah.com" http://localhost/
curl -s -o /dev/null -w "/eras/x/page/9999 -> %{http_code}\n" http://localhost/eras/x/page/9999
curl -s -o /dev/null -w "sitemap -> %{http_code}\n" http://localhost/sitemap-index.xml
curl -sI http://localhost/_astro/ 2>/dev/null | grep -i cache-control || true
curl -sI http://localhost/ | grep -i x-cache-status
```

Expected: `/`→200; `/eras`→200; www Host→301; bad page→404; sitemap→200; `/_astro/` carries `Cache-Control: public, immutable`; `X-Cache-Status` present.

- [ ] **Step 3: Tear down**

Run: `docker compose down`

---

# Phase 4 — Docs & final gate

## Task 21: Documentation

**Files:**
- Modify: `docs/DEPLOYMENT.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite the Web section of `docs/DEPLOYMENT.md`**

Replace the entire `## Web (\`apps/web\`)` section (Build / Deploy / nginx subsections — through the end of the nginx table and the TLS note) with:

```markdown
## Web (`apps/web`)

The web app is an Astro **server (SSR)** app, self-hosted on a VPS in a Docker container. Every route renders on-demand by calling the internal `api` container via the oRPC contract; nginx (bundled in the web image) caches the rendered HTML and serves built static assets from disk. There is no DB snapshot and no static `dist/` rsync.

### Build & deploy

```bash
docker compose up -d --build
```

The web image build runs `astro build` only — **no `DATABASE_URL` is needed at build time**. At runtime, `INTERNAL_API_URL` (set to `http://api:8787` in `docker-compose.yml`) points SSR at the api service. `PUBLIC_API_URL` is unset, so browser islands fall back to the production API.

### Caching & freshness

Each route sets a `Cache-Control` TTL (poems 24h, lists/indexes 1h, sitemaps 24h; the 404 is `no-store`); nginx (`proxy_cache`) honors it and serves stale on upstream errors / during background refresh. New or edited poems appear automatically within the TTL — no rebuild. nginx canonicalizes www→apex and trailing slashes, and serves `/_astro/` immutably.

### Sitemap

`/sitemap-index.xml` is generated on-demand (poems sharded at 45k URLs/file, plus poets and collection landing pages) and cached like any other route. `public/robots.txt` references it.

TLS is managed externally (certbot or a front reverse-proxy) and is intentionally absent from the container config.
```

- [ ] **Step 2: Update `CLAUDE.md`**

- In the **Packages** table, change the `apps/web` row stack to: `Astro 6 SSR (@astrojs/node, Bun), React 19 islands, TailwindCSS, TanStack Query`.
- Replace the **Architecture → `apps/web`** paragraph with: a description of on-demand SSR — pages call the internal `api` container via the oRPC contract (`src/lib/server/*`, `apiServer`), set `Cache-Control`, and nginx in the web image caches HTML + serves static assets; `PUBLIC_API_URL` points browser islands at prod; no DB access from web, no snapshot. Path alias `@/*` → `src/*`. RTL, non-trailing-slash canonical URLs.
- Replace the **Web deploy** paragraph with: VPS + Docker; `docker compose up -d --build`; the web image bundles nginx (proxy_cache + static + canonicalization) in front of the Bun SSR server; `INTERNAL_API_URL=http://api:8787`.
- In **Session Discipline**, remove the "Web build is ~10–15 min" bullet (the build is now seconds); if a build-time note is useful, replace it with: "Web build is `astro build` only (seconds); the running stack needs the `api` container up for SSR."

- [ ] **Step 3: Format the docs**

Run: `cd /Users/alwaleed.alqahani/Developer/qafiyah && bun run format`
Expected: Prettier formats the `.md` files; no errors.

- [ ] **Step 4: Commit**

```bash
git add docs/DEPLOYMENT.md CLAUDE.md
git commit --no-verify -m "docs: describe web on-demand SSR deploy and caching"
```

---

## Task 22: Full CI gate

**Files:** none (verification only)

- [ ] **Step 1: Ensure the DB is up (the `smoke` step now needs the API)**

`bun run ci` includes `smoke`, which boots `bun run dev` (web SSR **and** the api via turbo) and asserts ~15 real URLs return 200. Post-migration those pages fetch from the API, so the DB must be seeded first:

Run: `cd /Users/alwaleed.alqahani/Developer/qafiyah && bun run db:setup`
Expected: Docker Postgres on :5433 restored from the latest dump; `apps/api/.env` written. (The smoke's hardcoded slugs — `jahili`, `albasit`, `amna-bnt-otaiba`, the poem/rhyme/theme UUIDs — exist in the dump.)

- [ ] **Step 2: Run the repo CI gate**

Run: `cd /Users/alwaleed.alqahani/Developer/qafiyah && bun run ci`
Expected: format + lint + types + test + knip + madge + boundaries + audit + smoke all pass. In particular:
- **knip**: no unused exports (the deleted `src/lib/data/*` and `generatePageNumbers` are gone; the new `src/lib/server/*` exports are all imported by pages/sitemaps; `knip.json` web entry now points at `verify-seo.ts`).
- **madge / depcruise**: no circular imports; `apps/web/src` has no `@qafiyah/db` import.
- **types**: `astro check` + `tsc` clean.
- **smoke**: the SSR dev server renders every sampled route by calling the local API — this now validates the whole migration end to end. If a data route flakes with a 5xx because the API wasn't listening yet, re-run; the API (Bun) normally boots before `astro dev` is ready.

- [ ] **Step 3: Final commit (only if CI surfaced fixes)**

```bash
git add -A
git commit --no-verify -m "chore(web): finalize on-demand SSR migration"
```

---

## Self-Review

**Spec coverage (against `docs/superpowers/specs/2026-05-20-web-on-demand-ssr-design.md`):**

- §4.1 astro.config server+adapter → Task 8. ✅
- §4.2 `src/lib/server/*` (client, accessors, NOT_FOUND→null via `safe`/`isDefinedError`) → Tasks 1, 4, 5, 6. ✅
- §4.3 page rewrites (11 pages: poem, 4 collection paginated, 4 collection index, 2 poets, plus home/404) + 404 via `Astro.rewrite('/404')` + Cache-Control → Tasks 9–13. ✅
- §4.4 dynamic sitemap routes (index, poems shards, poets, collections) → Tasks 7 (builders) + 14 (routes). ✅
- §4.5 nginx full config (proxy_cache zone, path-only key, lock, use_stale, background_update, X-Cache-Status, /_astro immutable, canonicalization) → Task 17. ✅
- §4.6 multi-stage Dockerfile (no DB build arg) + entrypoint (tini, bun server + nginx) → Task 18. ✅
- §4.7 compose web service (no build arg, depends_on api, INTERNAL_API_URL) → Task 19. ✅
- §4.8 env (INTERNAL_API_URL from process.env, server-only) → Task 1 (placed in `src/lib/server/env.ts`, not the browser-imported `src/env.ts`, so it never lands in the client bundle — a refinement of the spec's "src/env.ts", honoring its intent more safely). ✅
- §4.9 package.json (remove @qafiyah/db, @astrojs/sitemap, serve; add @astrojs/node; build→astro build) → Tasks 8, 15. ✅
- §5 tests (server accessors mock the oRPC boundary; sitemap builders; cache; parsePageParam; verify-seo reworked; container smoke) → Tasks 1–7, 16, 18, 20. ✅
- §6 cache TTLs → Task 2. ✅
- §8 docs (DEPLOYMENT.md, CLAUDE.md) → Task 21. ✅

**Placeholder scan:** No "TBD"/"similar to"/"add error handling". Page-conversion tasks state precisely which lines change and that the `<Layout>` body is unchanged (the body genuinely does not change — it reads the same locals). The two operator-supplied values (`<real-slug>`, sample SEO slugs) are runtime data, not code placeholders.

**Type consistency:** Accessor names and shapes match between definition (Tasks 4–6) and use (Tasks 9–14): `getPoem`→`{Poem|null}`; `get{Era,Meter,Rhyme,Theme}PoemsPage`→`{poems,<entity>,pagination}|null` with `<entity>` ∈ {era,meter,rhyme,theme}; `getPoetsPage(page)`→`{poets,pagination}|null`; `getPoetPoemsPage(slug,page)`→`{poems,poet,pagination}|null`; `allEras/allMeters/allRhymes/allThemes`→list arrays. `parsePageParam(raw)→number|null`, `CACHE_*` strings, and the sitemap builders (`urlsetXml`, `sitemapIndexXml`, `shardCount`, `SITEMAP_POEMS_PER_SHARD`) are referenced with the exact names defined. The accessor `era` meta is `slugWithPoemCount` (`{name,slug,poemsCount}`) — the era paginated page uses only `era.slug`/`era.name`/`era.poemsCount`, so no template change is needed.
