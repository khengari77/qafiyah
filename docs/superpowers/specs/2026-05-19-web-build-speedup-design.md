# Web Static Build Speedup — Design

**Date:** 2026-05-19
**Target:** `apps/web` (Astro 6 static, Bun + Turborepo)
**Goal:** Drop the static build from ~2 h to ~6–16 min (target 10–20× speedup) for a ~100k-page Arabic poetry archive, without regressing SEO, output structure, browser bundles, or domain logic.

---

## 1. Background

`apps/web` is an Astro 6 site with `output: 'static'` that emits ~100k HTML pages (`/poems/[slug]`, paginated listings under `/poets/`, `/eras/`, `/meters/`, `/rhymes/`, `/themes/`). It is built locally and rsynced to a VPS behind nginx.

The current build pipeline (`apps/web/scripts/build-with-api.ts`):

1. Spawns `bun --filter=@qafiyah/api run dev` (Wrangler dev) on `127.0.0.1:8787`.
2. Waits for the port to accept connections.
3. Runs `astro build` with `BUILD_API_URL=http://127.0.0.1:8787` injected.
4. Each page's `getStaticPaths` and frontmatter performs HTTP fetches via oRPC (`apps/web/src/lib/api/rpc.ts` → `apiServer`) against that local Wrangler.
5. Each `/poems/{slug}` HTTP request crosses TCP → Wrangler's Node wrapper → Workers runtime → `postgres` (postgres.js) → Postgres (`localhost:5433`) and returns a row joined with related poems.
6. Tears down Wrangler.

### Why it is slow

- ~100k HTTP round-trips against a single-threaded Wrangler dev process.
- Per-request Workers-runtime setup compounds with per-request Postgres planning.
- The build script bumps `NODE_OPTIONS=--max-old-space-size=12288` to work around per-request memory accumulation in Wrangler's Node wrapper over ~2 h.
- `retryingFetch` (5 attempts, exponential backoff) papers over transport flakes — symptom of how marginal the HTTP layer is at this volume.

These symptoms point to a single root cause: the build re-uses the same HTTP edge-runtime path the production browser uses, but performs ~10⁵ requests over it. The HTTP/edge layer is the wrong tool for build-time bulk data access.

---

## 2. Goal & non-goals

**Goal.** Make the full build as fast as practical (target ≤ ~16 min, ideally ≤ ~10 min) while:

- Preserving the existing static output structure, canonical URLs, SEO metadata, sitemap, and JSON-LD payloads byte-equivalent.
- Preserving the React-islands-only client behavior of `apps/web`.
- Preserving the `@qafiyah/db` package contract (sole consumer remains `apps/api` at runtime; the web *build script* becomes an additional build-time consumer).
- Not shipping `@qafiyah/db` code into the browser bundle.

**Non-goals (this iteration).**

- Incremental rebuilds. We install the seam (per-entity content hashes in the snapshot) but do not implement skip-if-unchanged.
- Reducing page count. The ~100k pages are intentional for SEO.
- Pre-computing JSON-LD at snapshot time. Defer until profiling shows it.
- Sharding `poems.json` across files. Defer until memory bites.
- Browser-side runtime changes. `apiBrowser` (used by the search island) is unchanged.
- Replacing `postgres.js` driver or the DB connection profiles in `packages/db/src/client.ts`.
- Caching across builds. Each build is hermetic against the current DB state.

---

## 3. Architecture

Two-phase, no Wrangler involvement.

```
bun run build
  │
  ├─▶ generate-snapshot.ts                    (~20–45 s)
  │     • imports @qafiyah/db (createDb in 'long-lived' mode)
  │     • runs ~10 bulk queries + per-poem related-fn in a connection pool
  │     • writes apps/web/.data/*.json + snapshot-meta.json (with per-entity hashes)
  │
  └─▶ astro build                             (~5–15 min, parallel pages)
        • each route's getStaticPaths reads the snapshot via lib/data/loader.ts
        • getStaticPaths returns { params, props } — page body uses Astro.props
        • no fetch, no Wrangler subprocess, no NODE_OPTIONS hack
```

### Key shifts versus the current pipeline

1. **HTTP layer eliminated at build time.** ~10⁵ single-row HTTP fetches → ~10 bulk DB queries (plus one batched per-poem related-poems call). The Wrangler subprocess is removed.
2. **`Astro.props` carries page data.** Today, `getStaticPaths` returns only `params`, and the page frontmatter re-fetches its row. New: `getStaticPaths` returns `{ params, props }` with the full payload. Page body destructures — no second fetch.
3. **Boundaries preserved.** Web src code still does not import `@qafiyah/db`. Only the build-only Node script `apps/web/scripts/generate-snapshot.ts` does. The browser bundle is unaffected. `apiBrowser` keeps talking to prod for runtime search.
4. **Hash output is the seam for future incremental.** Not consumed in this iteration.

---

## 4. Components

### 4.1 `apps/web/scripts/generate-snapshot.ts` — NEW

Single-file Bun/Node script. Imports `createDb` from `@qafiyah/db` and the same query namespaces `apps/api` uses (`erasQueries`, `metersQueries`, `poemsQueries`, `poetsQueries`, `rhymesQueries`, `themesQueries`).

**Responsibilities:**

1. Read `DATABASE_URL` from env. Source: same `apps/api/.dev.vars` the API uses today (or any explicit env, validated up front). Fail loudly if missing.
2. `createDb(DATABASE_URL, { mode: 'long-lived' })` — uses the existing 20-connection pool profile from `packages/db/src/client.ts`.
3. Run bulk queries (one per call), each returning the *full* dataset for its entity. Where the existing query is paginated, the snapshot generator calls it in a loop until exhausted, or calls a new "unpaginated" variant inside `@qafiyah/db` if cleaner (see §6 for the choice).
4. For poem details: list all poem slugs, then run the existing `getPoemBySlug`-equivalent (the Postgres function that returns the poem + ~10 related) in parallel batches of ~20 against the local pool.
5. Compute a per-entity SHA-256 hash from canonicalized JSON of each emitted record (`poem`, `era`, `meter`, …). Aggregate into `snapshot-meta.json`.
6. Write JSON files atomically (`*.json.tmp` → `rename`).
7. Exit 0 on success, non-zero with a structured JSON error on failure (mirrors the `build-with-api.ts` error format for log-tooling continuity).

**Output: `apps/web/.data/`** (gitignored, regenerated each build):

```
.data/
├── snapshot-meta.json          # { generated_at, db_host, schema_hash, entity_counts, per_page_hashes }
├── eras.json                   # Era[]
├── meters.json                 # Meter[]
├── rhymes.json                 # Rhyme[]
├── themes.json                 # Theme[]
├── poets.json                  # Poet[]              (each with poemsCount)
├── poet-poems.json             # { [poetSlug]: PoemListItem[] }     full sorted list per poet
├── era-poems.json              # { [eraSlug]:  PoemListItem[] }
├── meter-poems.json            # { [meterSlug]: PoemListItem[] }
├── rhyme-poems.json            # { [rhymeSlug]: PoemListItem[] }
├── theme-poems.json            # { [themeSlug]: PoemListItem[] }
└── poems.json                  # Record<PoemSlug, PoemDetail>       all ~100k poems with relatedPoems
```

Types come from `@qafiyah/contracts` (`poemListItem`, `poemDetail`, `slugWithPoemCount`, etc.) — the same shapes the oRPC contracts use, so page code's static types are unchanged.

### 4.2 `apps/web/src/lib/data/` — NEW (replaces `src/lib/api/static/`)

A small module with read-only, module-scope cached accessors.

```
src/lib/data/
├── loader.ts          # readSnapshotFile<T>(name) -> T   with module-level memoization
├── poems.ts           # allPoems(): Map<PoemSlug, PoemDetail>;  getPoem(slug)
├── poets.ts           # allPoets(): Poet[]; getPoetPoemsPage(slug, page) -> { poems, totalPages, meta }
└── collections.ts     # allEras / allMeters / allRhymes / allThemes
                        # getEraPoemsPage / getMeterPoemsPage / getRhymePoemsPage / getThemePoemsPage
```

**Loader contract:**

- `loader.ts` exposes `readSnapshotFile<T>(name)`: `fs.readFileSync` from `apps/web/.data/<name>.json`, `JSON.parse`, store in a module-scope `Map`. Subsequent calls return the cached value.
- Each accessor in `poems.ts`/`poets.ts`/`collections.ts` wraps `readSnapshotFile` and exposes domain-shaped helpers.
- Pagination math (`POEMS_PER_PAGE = 30` from `@qafiyah/constants`) lives in `poets.ts`/`collections.ts`, not in pages.
- No `neverthrow` Result types at this boundary. A missing snapshot file is a programmer error (build misconfigured) — throw with a clear message; the build should abort.

**Imports:** Loader code uses `node:fs` and `node:path`. It runs only in Node during build (Vite's SSR transform), never in the browser bundle.

### 4.3 Page changes — 11 `.astro` files

**7 dynamic routes with `getStaticPaths`:**

| File | Loader call | Props returned |
|---|---|---|
| `pages/poems/[slug].astro` | `allPoems()` | `{ poem, layout }` |
| `pages/poets/page/[page].astro` | `allPoets()` | `{ poets, pagination }` |
| `pages/poets/[slug]/page/[page].astro` | `getPoetPoemsPage(slug, page)` | `{ poems, poet, pagination }` |
| `pages/eras/[slug]/page/[page].astro` | `getEraPoemsPage(slug, page)` | `{ poems, era, pagination }` |
| `pages/meters/[slug]/page/[page].astro` | `getMeterPoemsPage(slug, page)` | `{ poems, meter, pagination }` |
| `pages/rhymes/[slug]/page/[page].astro` | `getRhymePoemsPage(slug, page)` | `{ poems, rhyme, pagination }` |
| `pages/themes/[slug]/page/[page].astro` | `getThemePoemsPage(slug, page)` | `{ poems, theme, pagination }` |

Pattern (illustrated with `/poems/[slug]`):

```astro
---
import { allPoems } from '@/lib/data/poems';
import { buildPoemLayout } from '@/lib/poem-page';
// ...

export async function getStaticPaths() {
  const poems = allPoems();             // Map<PoemSlug, PoemDetail>, cached
  return Array.from(poems, ([slug, poem]) => ({
    params: { slug },
    props:  { poem, layout: buildPoemLayout(poem, slug) },
  }));
}

const { poem, layout } = Astro.props;   // no fetch, no Result unwrap
---
<Layout {...layout} ...>
  <PoemDisplay client:idle ... />
</Layout>
```

For paginated routes, `getStaticPaths` iterates entities, computes pages from each entity's list (sliced from `<entity>-poems.json`), and emits one entry per page with the page-slice in props. Pagination metadata (`totalPages`, `hasNext`, etc.) is computed in `lib/data/*.ts` and passed via `props`.

**Existing helpers reused unchanged:**

- `lib/poem-page.ts` (`loadPoemPage`, `buildPoemLayout`) — refactor `loadPoemPage` to take a `Poem` directly instead of refetching, or inline its body and call `buildPoemLayout` from the page; either is fine, choose whichever produces less churn (the plan task will pick).
- `lib/page-numbers.ts` (`generatePageNumbers`, `parsePageParam`) — unchanged.
- `lib/astro-boundary.ts` (`unwrapForBoundary`, `boundaryError`) — still used for snapshot-read errors at boundaries.
- `lib/breadcrumbs.ts`, `lib/arabic.ts`, `lib/flatten-verses.ts`, `lib/utils.ts` — unchanged.

**4 frontmatter-fetch routes (no `getStaticPaths`):**

| File | Loader call |
|---|---|
| `pages/eras/index.astro` | `allEras()` (replaces `fetchEras`) |
| `pages/meters/index.astro` | `allMeters()` |
| `pages/rhymes/index.astro` | `allRhymes()` |
| `pages/themes/index.astro` | `allThemes()` |

Pure frontmatter swap. No `Astro.props` needed since these are single-instance pages.

**Unchanged pages:**

- `pages/index.astro` — no API calls today, no changes.
- `pages/404.astro` — no API calls today, no changes.

### 4.4 `apps/web/scripts/build.ts` — NEW (replaces `build-with-api.ts`)

Three steps, no subprocess gymnastics:

1. `bun apps/web/scripts/generate-snapshot.ts` — propagates exit code on failure.
2. `astro build` (from `apps/web` cwd).
3. Exit with `astro build`'s exit code.

`apps/web/package.json` `build` script changes from `bun ./scripts/build-with-api.ts` to `bun ./scripts/build.ts`. `build:raw` (calls `astro build` directly) stays for in-place rebuilds when `.data/` already exists from a previous run.

### 4.5 Files removed

- `apps/web/scripts/build-with-api.ts`
- `apps/web/src/lib/api/static/` (all 5 files: `dedup.ts`, `poets.ts`, `collections.ts`, `result.ts`, `poems.ts`)
- `apiServer`, `retryingFetch`, `RETRY_*` constants, `SSR_BASE_URL` from `apps/web/src/lib/api/rpc.ts`. `apiBrowser`, `BROWSER_BASE_URL`, and the exported types stay.
- `BUILD_API_URL` from `apps/web/src/env.ts` (and any references).
- `NODE_OPTIONS=--max-old-space-size=12288` / `WRANGLER_LOG=warn` build-time overrides — irrelevant once Wrangler is no longer spawned at build.

### 4.6 `.gitignore`

Add `apps/web/.data/` to the relevant `.gitignore` (root or `apps/web/.gitignore`).

---

## 5. Tests

### 5.1 New tests

- `apps/web/src/lib/data/loader.test.ts` — points the loader at a temp directory, writes synthetic snapshot JSON, asserts cached behavior on second read and that a missing file throws with a clear message. No DB required.
- `apps/web/src/lib/data/poems.test.ts`, `poets.test.ts`, `collections.test.ts` — exercise the domain accessors against synthetic snapshot fixtures. Cover: pagination math, unknown-slug behavior (return empty / throw — decided in plan), empty-collection behavior.
- `apps/web/scripts/generate-snapshot.test.ts` (integration, opt-in via `SNAPSHOT_DB_URL`) — runs against the local `bun run db:setup` Postgres, asserts the output JSON files exist, are non-empty, and contain expected shapes. Default test runs skip when env is absent.

### 5.2 Tests removed / migrated

- Tests under `apps/web/` that imported from `src/lib/api/static/*` migrate to import from `src/lib/data/*`. Functional assertions adapt to the new accessors. Any `vi.mock('@orpc/client')` or `apiServer` stubs are removed — the loader is the new boundary to mock when a page's behavior is being tested. Per the existing feedback memory ("@qafiyah/db is the DB boundary for test-mocking"), apps/web tests continue to *not* mock `@qafiyah/db` — they mock the loader.

### 5.3 SEO verification

`apps/web/scripts/verify-seo.ts` is unchanged in source but should continue to pass against the new build output. The plan includes one task that runs it post-build against a partial-build directory to confirm parity.

---

## 6. Risks & mitigations

### 6.1 Related-poems computation (chosen: keep using the existing SQL function)

The current `/v1/poems/{slug}` endpoint calls a Postgres function (`get_poem_with_related` or equivalent) that returns the poem joined with up to 10 related poems. Reproducing the ranking/selection in JavaScript would duplicate logic the database owns.

**Plan A (default):** the snapshot generator calls the same `poemsQueries.getPoemBySlug` (which already invokes the Postgres function) for every poem slug, with concurrency = 20 (matching the `'long-lived'` pool max from `packages/db/src/client.ts`). At ~1–3 ms per call locally, 100k × parallel-20 → ~5–15 s wall-clock.

**Plan B (fallback, only if A profiles too slow):** add a single bulk query in `packages/db/src/poems.queries.ts` (e.g. `listAllPoemsWithRelated`) that returns the joined rows in one round-trip. Implementation lives in `@qafiyah/db`, exposed via a new query function; the API does not need to expose it. The plan does not pre-implement this — measure first.

### 6.2 Memory footprint

`poems.json` is the heavy one: ~100k poems × ~2–3 KB each on disk ≈ 200–300 MB; parsed JS objects ≈ 500 MB–1 GB in a single process. Modern Mac with ≥16 GB RAM handles this comfortably.

**Worker amplification.** If Astro/Vite spawns N parallel render workers and each loads its own copy, peak memory is N × 1 GB. Mitigation if it bites:

1. First, measure with `/usr/bin/time -l astro build` (peak RSS).
2. If peak < 8 GB on the build host, no change needed.
3. If higher: shard `poems.json` by `slug[0..2]` into ~256 small files; the loader reads only the shard a given render needs. We keep this as a documented follow-up — no preemptive sharding.

### 6.3 Snapshot freshness

Always regenerated. `apps/web/.data/` is gitignored, never copied across builds. No staleness risk. A future incremental layer would add explicit hash validation before re-using cached data.

### 6.4 DB env wiring

The snapshot generator reads `DATABASE_URL` directly. Convention: source it from the same `apps/api/.dev.vars` that the API uses today (parsed via Bun's built-in env file support, or a tiny dotenv read). If the var is missing, the script exits 1 with a clear message and hints (mirroring the `build-with-api.ts` `hints` array). The plan task explicitly defines this wiring.

### 6.5 Astro version parallelism behavior

Astro 6 + Vite 7 builds pages in parallel by default for static output. We rely on this but do not configure it explicitly. If profiling shows it's serial, we add Vite worker tuning as a follow-up; we do not preemptively configure workers.

### 6.6 Schema drift between snapshot and contracts

Risk: `@qafiyah/contracts` types and the DB query result shapes get out of sync, and the snapshot writes a shape pages can't read.

Mitigation: snapshot output types come from `@qafiyah/contracts` schemas (Valibot `InferOutput`), same as the API procedures use. Compile-time check via the existing `bun run types` covers this. The plan adds a one-time check that the snapshot's first row of each entity validates against the contract's Valibot schema, throwing a structured error on mismatch.

### 6.7 Tests that previously hit oRPC clients

Tests under `apps/web` that stubbed `apiServer` or `OpenAPILink` need to migrate to mocking `lib/data/*` accessors. The plan covers each test file individually.

---

## 7. Future incremental — seams installed, not implemented

`apps/web/.data/snapshot-meta.json` will include:

```json
{
  "generated_at": "2026-05-19T17:00:00.000Z",
  "db_host": "127.0.0.1",
  "schema_hash": "<sha256-of-…>",
  "entity_counts": { "poems": 100123, "poets": 472, … },
  "per_page_hashes": {
    "/poems/<slug-a>": "<sha256>",
    "/poets/<slug-b>/page/3": "<sha256>",
    …
  }
}
```

A future `apps/web/scripts/incremental-build.ts` will:

1. Read `apps/web/.cache/last-snapshot-meta.json` (last successful build's hashes).
2. Diff per-page hashes with the current `snapshot-meta.json`.
3. For routes whose hash is unchanged, copy the corresponding `index.html` from `apps/web/.cache/dist/` to `apps/web/dist/`.
4. Invoke `astro build` only for routes whose hash changed (using a custom integration that prunes `getStaticPaths` output by route).

The current iteration only writes `snapshot-meta.json` with the right shape. No reader, no cache copy.

---

## 8. Expected speedup

| Step | Now | After |
|---|---|---|
| Wrangler boot                | ~5–10 s | 0 |
| ~100k HTTP fetches           | ~75–90 min | 0 |
| Bulk DB queries              | included above | ~15–30 s |
| Per-poem related-fn (×100k, pool=20) | included | ~5–15 s |
| Astro HTML rendering         | ~30 min | ~5–15 min (parallel, CPU-bound) |
| Snapshot file I/O            | 0 | ~1–3 s |
| **Total**                    | **~2 h** | **~6–16 min** |

The HTTP and Wrangler overheads — dominating ~90 min today — drop to ~0. The Astro rendering phase compresses because each page's frontmatter becomes a memory read instead of an HTTP RTT, and pages render in parallel across cores. Target: 10–15× speedup; 20× is plausible on an 8-core box with healthy I/O.

---

## 9. Boundaries & invariants

- **Browser bundle untouched.** Nothing under `apps/web/src/lib/data/` may be imported by client islands. Vite's SSR-only transform handles this; we add a CI check (knip or a simple grep) only if a regression occurs.
- **`@qafiyah/db` boundary.** `apps/api` remains the runtime consumer. `apps/web/scripts/generate-snapshot.ts` becomes a *build-time* consumer. No `@qafiyah/db` import appears under `apps/web/src/`.
- **Production runtime is unaffected.** `apps/api` (Cloudflare Workers), `apiBrowser` (browser-side search), the prod DB, nginx config, and `/v1/poems/random` are all untouched.
- **Output equivalence.** `dist/` should be byte-equivalent or near-equivalent to today's output for SEO/UX purposes. `verify-seo.ts` is the gate.

---

## 10. Open questions

None blocking. Decisions deferred to plan-time (call-site choice, not architecture):

- Inline `loadPoemPage` into `pages/poems/[slug].astro` vs. refactor `loadPoemPage` to take a `Poem` directly. Either is fine; the plan picks whichever produces less churn in the diff.
- Whether to validate snapshot output against contract Valibot schemas on every build (cheap, ~100 ms) or only in CI. Recommend: every build.
