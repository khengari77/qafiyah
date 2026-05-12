# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qafiyah is an Arabic poetry repository (pnpm + Turborepo monorepo): `apps/web` (Astro 6 static site), `apps/api` (Hono + oRPC on Cloudflare Workers + Postgres; owns the DB layer), `apps/bot` (X/Twitter bot), `packages/constants` (shared brand/URLs/dev-ports), `packages/typescript` (shared tsconfigs).

## Commands

```bash
pnpm dev             # turbo dev (web + API)
pnpm build           # turbo build in dependency order
pnpm lint            # biome check --write .
pnpm format          # biome format + prettier (md/mdx only)
pnpm types           # tsc --noEmit across all workspaces
pnpm test            # vitest across all workspaces
pnpm db:setup        # first-time DB setup (Docker: dev on :5433, test on :5434)
pnpm clean:dev       # kill orphan astro/wrangler/workerd processes scoped to this repo
pnpm ci              # format + lint + types + test + knip + madge (circular-deps)

# Per-workspace
pnpm --filter @qafiyah/api dev                        # wrangler dev
pnpm --filter @qafiyah/api dev:test                   # wrangler dev --env test
pnpm --filter @qafiyah/api test                       # vitest (API only)
vitest run path/to/file.test.ts                       # single test file (within a workspace)
```

## Tooling

- **Biome** for all JS/TS lint + format (not ESLint/Prettier). Config in `biome.json`: 2-space indent, 100-char width, single quotes, es5 trailing commas.
- **Prettier** for `.md`/`.mdx` only.
- **Commitlint** enforces Conventional Commits (`feat`, `fix`, `refactor`, etc.).
- **knip** and **madge** run in `pnpm ci` to catch unused exports and circular imports.

## Architecture

**`apps/web`** — Astro 6 static output; queries the API over HTTP at build time (`src/lib/api/static.ts` → typed fetcher in `src/lib/api/rpc.ts`). `pnpm --filter @qafiyah/web build` runs `scripts/build-with-api.mjs`, which auto-starts a local Wrangler instance on :8787 if one isn't already up, sets `BUILD_API_URL=http://127.0.0.1:8787` (server-only env), runs `astro build`, then tears Wrangler down. `PUBLIC_API_URL` stays pointed at production so the browser bundle hits the prod API at runtime. React is islands-only (search, nav, random poem). Path alias `@/*` → `src/*`. RTL Arabic layout in `src/layouts/Layout.astro`. Canonical URLs are non-trailing-slash (`trailingSlash: 'never'` + `build.format: 'directory'`); both `/page` and `/page/` resolve at the host, with the host 301-ing the trailing form to canonical.

**Web deployment** — Self-hosted on a VPS behind nginx. Build is produced locally (`pnpm --filter @qafiyah/web build`) and `apps/web/dist/` is rsynced to the server (default web root `/var/www/qafiyah`). Reference server block: `apps/web/nginx.conf` — handles www→apex, trailing-slash→canonical, `try_files $uri $uri/index.html`, and immutable caching for `/_astro/`. TLS is managed outside this file (certbot or a fronting reverse proxy).

**`apps/api`** — Hono on Cloudflare Workers, with the query layer colocated under `src/db/` (Drizzle schema, queries, Postgres client, utilities). Every domain (`eras`, `meters`, `poems`, `poets`, `rhymes`, `themes`, `search`) is exposed via an oRPC procedure in `src/contracts/*.contract.ts`, composed into `src/router.ts`, and mounted on Hono via `OpenAPIHandler` in `src/app.ts`. `/poems/random` (text response) and `/` (API index) stay as plain Hono routes. The web imports `type { AppRouter } from '@qafiyah/api/router'` for response-type inference; no API source code is shipped to the browser. Wrangler's esbuild bundles everything from source.

**`apps/bot`** — Posts a random poem via `twitter-api-v2` on a GitHub Actions cron at 08/12/16/20 UTC (see `.github/workflows/post-poem.yml`). Calls `/poems/random` (plain-text endpoint, unchanged by the oRPC migration). Exponential backoff, 3 retries.

**`packages/constants`** — Source-only (no build step). Exports brand strings, production URLs, dev ports (`DEV_WEB_PORT=4321`, `DEV_API_PORT=8787`), and external links. Consumed by `web`, `api`, and `bot`. When changing a URL or port, update here — not in app code.

**`packages/typescript`** — Shared tsconfigs (`base`, `astro`, `cloudflare`, `node`). Not published; referenced via workspace.

## Quality Checklist (TRUST 5)

Before marking any task complete, verify all five:

|       | Criterion | Gate                                                    |
| ----- | --------- | ------------------------------------------------------- |
| **T** | Tested    | `pnpm test` passes; new logic has coverage              |
| **R** | Readable  | 0 lint errors (`pnpm lint`); names are self-explanatory |
| **U** | Unified   | Matches repo style (Biome config, Conventional Commits) |
| **S** | Secured   | No secrets in code; inputs validated at boundaries      |
| **T** | Trackable | Commit message explains _why_, not just what            |

## Code Annotations

Mark only code that will surprise a future reader. Three tags, inline only:

```ts
// @ANCHOR: <why this is a choke point> — used when 3+ callers depend on this contract
// @WARN: <danger> — goroutine-equivalent async, global mutation, non-obvious side-effect
// @NOTE: <context> — magic constant, workaround, constraint not visible from the code
```

Use sparingly. Most code needs none.

## Session Discipline

- **One mission per session.** Don't mix unrelated tasks in the same thread.
- **If a dev request hangs or `pnpm dev` complains about a port,** run `pnpm clean:dev` to kill orphan `astro dev` / `wrangler` / `workerd` processes scoped to this repo, then restart. `dev/check-port.mjs` guards both servers against silently binding a non-default port.
- **Database dumps live in `data/datasets/`** (newest folder is the latest). `pnpm db:setup` restores the latest into a Docker Postgres on port 5433 (dev) and 5434 (test).
- **Web build is ~2 hours end-to-end.** When verifying a change (not producing a real `dist/`), run `pnpm --filter @qafiyah/web build` as a background process and kill it after ~20 seconds — that's enough for Wrangler to start, Astro to begin, and the first `getStaticPaths` calls to surface any contract/API/runtime errors. Only let it run to completion when the user explicitly asks for a deployable build. After killing, run `pnpm clean:dev` to reap the orphaned Wrangler.

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings in template expressions.
