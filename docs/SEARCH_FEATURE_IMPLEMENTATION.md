# Search Feature Implementation

## About This Document

Reference for Qafiyah's **Elasticsearch**-based search. It replaced the previous
custom PostgreSQL Full-Text Search (FTS) implementation (diacritic-normalizing SQL
functions, `tsvector` generated columns, GIN indexes, and `search_poems`/`search_poets`
stored procedures), all of which have been removed — see `scripts/sql/0001_drop_search.sql`
and the `0004` baseline dump.

## Architecture

```
Postgres (source of truth)  ──reindex/reconcile──▶  Elasticsearch  ◀──query──  apps/api  ◀── apps/web
        (apps/worker reads via @qafiyah/db)         (poems / poets aliases)     (/v1/search)   (island)
```

- **`packages/search` (`@qafiyah/search`)** — all Elasticsearch logic, **Postgres-free**: client factory, explicit index mappings + Arabic analyzers, document mappers, query builders, and admin primitives (ensure-index, bulk, reindex, alias-swap, reconcile). Both `apps/api` and `apps/worker` depend on it.
- **`apps/api`** — queries Elasticsearch (never Postgres) for search via a cached `es` middleware. Returns grouped results.
- **`apps/worker` (`@qafiyah/worker`)** — long-lived container: reads Postgres via `@qafiyah/db`, maps rows with `@qafiyah/search`, bulk-indexes into ES on boot (if empty), and reconciles weekly. Exposes `/healthz` + an authenticated `/reconcile`.

## Index design

Two versioned indices behind stable aliases for zero-downtime reindex: `poems_v{N}` → alias `poems`, `poets_v{N}` → alias `poets`. Mappings are **explicit** (`dynamic: "strict"`).

Each Arabic text field is multi-field (`packages/search/src/indices.ts`):

- the analyzed field (`arabic_normalized`: diacritics stripped, alef/ya/ta-marbuta folded, tatweel removed),
- `.exact` — a `keyword` sub-field (`ignore_above: 256`) for exact whole-value matches (titles/names; long content/bio skip it),
- `.stemmed` — `arabic_stemmed` (adds Arabic stopwords + stemmer) for recall.

Original (diacritic-bearing) text is stored in `*Display` fields for display; the matching/highlight copy is diacritic-stripped (`packages/search/src/documents.ts`). Analyzers live in `packages/search/src/analysis.ts`.

**Query** (`packages/search/src/query.ts`): filters (poet/era/meter/rhyme/theme slugs for poems; era for poets) are ES **filter clauses** (`bool.filter` `terms`) so they're cacheable and don't affect scoring. Text matches are boosted exact (^5) > normalized (^3) > stemmed (^1); `matchType` maps to phrase (`exact`) / AND (`all`) / OR (`any`). Highlighting (`<mark>`) is enabled on `content`/`title` (poems) and `bio`/`name` (poets).

## Search API

Single endpoint `GET /v1/search` (`apps/api/src/procedures/search.procedures.ts`, contract in `packages/contracts/src/search.ts`). Input: `q`, `types` (`['poems','poets']` default), `poemsPage`/`poetsPage`, `matchType`, and slug filters. It queries the requested types **in parallel** and returns grouped, independently-paginated sections:

```json
{ "q": "...", "poems": { "data": [...], "pagination": {...} } | null,
                "poets": { "data": [...], "pagination": {...} } | null }
```

A section is `null` when its type isn't requested (so the same endpoint serves "poems only" / "poets only").

## Sync model (no outbox)

The dataset is read-only at runtime and ships via curated DB dumps, so there is **no outbox/transactional enqueue**. Sync is:

1. **Bulk reindex** — `bun run reindex` (or `docker compose run --rm worker bun run src/reindex.ts`): builds a fresh `*_v{N+1}` index, bulk-loads from Postgres, atomically swaps the alias, drops the old version. Run on deploy / after loading a new dump.
2. **Weekly reconciliation** — the worker scrolls ES (slug→content-hash), diffs against Postgres, and upserts changed/missing + deletes orphaned docs. Triggered weekly by `.github/workflows/reconcile.yml` POSTing the worker's authenticated `/reconcile` (GitHub runners can't reach the loopback DB/ES, so they go through the worker's Cloudflare Tunnel hostname).

## Operations

- Local: `bun run es:up` (single-node ES on `127.0.0.1:9200`), then `bun run reindex`.
- Health: `GET http://127.0.0.1:8088/healthz` (worker) reports `lastReindexAt` / `lastReconcileAt` / `lastError`.

## Gotchas

- **Bun + `@elastic/elasticsearch`**: the client's default (undici) transport throws `response.headers undefined` under Bun. `createSearchClient` forces `Connection: HttpConnection` (Node-http), which works under both Bun (api + worker runtimes) and Node (vitest). Do not remove.
- **Keyword term limit**: long fields (`content`, `bio`) exceed Lucene's 32 KB keyword limit; the `.exact` sub-field uses `ignore_above: 256` so they index without error.
- **Integration tests** share one ES instance — `packages/search/vitest.config.ts` sets `fileParallelism: false` so test files don't race on indices/aliases.

## Environment

- `ELASTICSEARCH_URL` — optional for `apps/api` (defaults to `http://localhost:9200`; prod sets `http://elasticsearch:9200` via compose); required for `apps/worker`.
- `RECONCILE_TOKEN` — shared secret the worker requires on `/reconcile`; set in the VPS `.env` and as a GitHub Actions secret (with `WORKER_RECONCILE_URL`).
