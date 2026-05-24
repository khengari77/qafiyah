# CLAUDE.md

**Qafiyah** — Arabic poetry monorepo (Bun + Turborepo).

## Packages

| Package               | Stack                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| `apps/web`            | Astro 6 SSR (@astrojs/node + Bun), React 19 islands, TailwindCSS, TanStack Query   |
| `apps/api`            | Hono + oRPC + Valibot, Bun server (Docker), OpenAPI                                |
| `apps/bot`            | X/Twitter bot via `twitter-api-v2`, GitHub Actions cron                            |
| `apps/worker`         | Postgres→Elasticsearch sync (boot reindex + weekly reconcile), Bun server (Docker) |
| `packages/db`         | Drizzle ORM + PostgreSQL (API + worker reads; no search logic)                     |
| `packages/search`     | Elasticsearch: client, Arabic analyzers/mappings, query + reindex/reconcile        |
| `packages/contracts`  | Shared oRPC contracts (Valibot)                                                    |
| `packages/constants`  | Brand/URLs/ports                                                                   |
| `packages/typescript` | Shared tsconfigs                                                                   |

## Commands

```bash
bun run dev             # seeded Postgres (Docker) + hot-reload web & API
bun run up / down       # full stack in Docker (DB self-seeds first boot) / stop
bun run db:up           # just the seeded Postgres container (:5433)
bun run db:reset        # wipe DB volume + re-seed from latest dump
bun run build / lint / format / types / test
bun run clean           # kill orphan astro/api-server processes
bun run ci              # format + lint + types + test + knip + madge + audit + smoke

bun --filter @qafiyah/api run dev|test
vitest run path/to/file.test.ts
```

## Tooling

- **Biome**: JS/TS lint + format — 2-space, 100-char, single quotes, es5 commas
- **Prettier**: `.md`/`.mdx` only
- **Commitlint**: Conventional Commits (`feat`, `fix`, `refactor`, …)
- **knip** + **madge**: unused exports + circular imports (CI only)
- **envin**: type-safe env via `src/env.ts`; fails at boot on bad/missing vars

## Architecture

**`apps/web`** — On-demand SSR (`output: 'server'`, `@astrojs/node` standalone run under Bun). Every route renders per request by fetching from the internal `api` container via the oRPC contract: server-only accessors in `src/lib/server/*` (`apiServer`, pointed at `INTERNAL_API_URL`) map the API's HTTP error status to a 404 (`errorStatus` — the API serializes Problem+JSON, so the oRPC client only exposes status-mapped errors; the poem endpoint returns 500 for a missing poem), and each page sets a `Cache-Control` TTL. No DB access from web, no snapshot. `PUBLIC_API_URL` points the browser islands at prod (falls back to prod when unset). Dynamic sitemap routes under `src/pages/sitemap*`. React is islands-only. Path alias `@/*` → `src/*`. RTL layout. Non-trailing-slash canonical URLs.

**Web deploy** — VPS + Docker: `docker compose up -d --build`. The web image bundles nginx (proxy_cache + static asset serving + www→apex/trailing-slash canonicalization) in front of the Bun SSR server, running **fully non-root** (nginx on `8080`); `INTERNAL_API_URL=http://api:8787`. Compose binds every published port to `127.0.0.1` (Cloudflare Tunnel fronts everything) and maps host `:80` → container `:8080`. Prod credentials come from a gitignored `.env` (see `.env.example`); dev uses the built-in defaults. nginx serves cached HTML on hits and `/_astro/` immutably; freshness is TTL-based (no rebuild for new poems).

**`apps/api`** — Thin Hono layer over `@qafiyah/db`. Entrypoint `src/server.ts` (run via `bun run src/server.ts`); reads `DATABASE_URL`/`PORT`/`ENVIRONMENT` from `process.env`. No Drizzle/postgres imports in `apps/api/src`. Procedures in `src/procedures/*.procedures.ts`, composed in `src/router.ts`, mounted via `OpenAPIHandler`. `/poems/random` and `/` are raw Hono routes. Runs as a long-lived Bun process **as the non-root `bun` user** from a multi-stage, devDependency-pruned image (the per-process db-cache in `db.middleware.ts` is shared across all requests). No API code ships to browser.

**`packages/db`** — Query namespaces: `erasQueries`, `metersQueries`, `poemsQueries`, `poetsQueries`, `rhymesQueries`, `indexingQueries`, `themesQueries`. Factory: `createDb(url)`. `indexingQueries` (`streamPoemBatch`/`streamPoetBatch`/`getPoemsBySlugs`/`getPoetsBySlugs`) feed the Elasticsearch reindex/reconcile run by `apps/worker`. Consumers: `apps/api` and `apps/worker`. No search logic lives here anymore — search is Elasticsearch via `@qafiyah/search`.

**`packages/search`** — Postgres-free Elasticsearch layer: `createSearchClient` (forces `Connection: HttpConnection` — the default undici transport breaks under Bun), explicit Arabic mappings/analyzers (diacritic strip + alef/ya/ta-marbuta folding + stemming), document mappers, boosted query builders (filters as cacheable `bool.filter` clauses), and admin primitives (`ensureIndex`/`bulkIndex`/`swapAlias`/`reindexFromSource`/`reconcileFromSource`). Consumed by `apps/api` (query) and `apps/worker` (sync).

**`apps/api` search** — `/v1/search` queries Elasticsearch (never PG) via a cached `es` middleware, returning grouped `{ q, poems, poets }` with per-section pagination; both sections queried in parallel.

**`apps/worker`** — long-lived Bun container: reads PG via `@qafiyah/db`, syncs to ES via `@qafiyah/search`. On boot reindexes if the alias is empty; reconciles weekly; exposes `/healthz` + an authenticated `/reconcile`. No outbox — the dataset is read-only/dump-shipped, so sync = bulk reindex on deploy + weekly drift repair. **Excluded from `bun run dev`** (dev.sh filters to web+api).

**`apps/bot`** — Cron at 08/12/16/20 UTC (11/15/19/23 KSA). Calls `/poems/random`, posts via `twitter-api-v2`. Exponential backoff, 3 retries.

**`packages/constants`** — Always update brand strings, URLs, and ports here (`DEV_WEB_PORT=4321`, `DEV_API_PORT=8787`), never in app code.

## CI Workflows

- `ci.yml` — format, lint, types, test, knip, madge, audit
- `post-poem.yml` — bot cron
- `reconcile.yml` — weekly Postgres↔Elasticsearch reconciliation (POSTs the worker's `/reconcile`)
- `gitleaks.yml` — secret scanning on push/PR

## Session Discipline

- **One mission per session.**
- Port conflicts → `bun run clean`, restart.
- DB dumps in `dumps/` (newest = latest). See `dumps/MAINTAINERS_GUIDE.md`.
- **Web build is `astro build` only (~seconds)** — no snapshot. The running stack needs the `api` container (and DB) up for SSR; `bun run dev` starts both. Verify pages with `astro dev` + curl against a seeded DB (`bun run db:up`).

## Quality Checklist (TRUST 5)

|       | Criterion | Gate                                               |
| ----- | --------- | -------------------------------------------------- |
| **T** | Tested    | `bun run test` passes; new logic has coverage      |
| **R** | Readable  | 0 lint errors; self-explanatory names              |
| **U** | Unified   | Biome config + Conventional Commits                |
| **S** | Secured   | No secrets in code; inputs validated at boundaries |
| **T** | Trackable | Commit message explains _why_                      |

## Code Annotations

```ts
// @ANCHOR: <why>   — 3+ callers depend on this contract
// @WARN: <danger>  — async side-effect, global mutation
// @NOTE: <context> — magic constant, workaround
```

Use sparingly.

## Known Denormalizations

- `apps/web/src/constants.ts` defines hardcoded `ERAS_OPTIONS`, `METERS_OPTIONS`, `RHYMES_OPTIONS` (ids 1–36, one per qafiyah letter), `THEMES_OPTIONS` arrays that mirror what the `/v1/{eras,meters,rhymes,themes}` endpoints expose. They power the search filter UI without a runtime fetch, but must be regenerated by hand when domain rows are added.

## Known Bug

`@astrojs/compiler` older releases crash on `"` inside `${}` in Astro templates. Now on `4.0.0` via `astro@6.3.3`. Workaround: use helper functions instead of inline quoted strings. Remove this section if no longer reproducible.

> See `AGENTS.md` for per-file coding standards (TypeScript dialect, logic, naming, errors, testing).
