# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qafiyah is an Arabic poetry repository (pnpm + Turborepo monorepo): `apps/web` (Astro 6 static site), `apps/api` (Hono on Cloudflare Workers + Postgres), `apps/bot` (X/Twitter bot), `packages/db` (shared Drizzle schema + queries + client), `packages/constants` (shared brand/URLs/dev-ports), `packages/typescript` (shared tsconfigs).

## Commands

```bash
pnpm dev             # turbo dev (^build builds @qafiyah/db before web/API servers)
pnpm build           # turbo build in dependency order
pnpm lint            # biome check --write .
pnpm format          # biome format + prettier (md/mdx only)
pnpm types           # tsc --noEmit across all workspaces
pnpm test            # vitest across all workspaces
pnpm db:setup        # first-time DB setup (Docker: dev on :5433, test on :5434)
pnpm clean:dev       # kill orphan astro/wrangler/workerd processes scoped to this repo
pnpm ci              # format + lint + types + test + knip + madge (circular-deps)

# Per-workspace
pnpm turbo run dev --filter=@qafiyah/api              # (^build → db) then wrangler dev
pnpm turbo run dev:test --filter=@qafiyah/api         # (^build → db) then wrangler dev --env test
pnpm --filter @qafiyah/api build:deps && pnpm --filter @qafiyah/api dev   # standalone (no Turbo dev graph)
pnpm --filter @qafiyah/api test                       # vitest (API only)
pnpm --filter @qafiyah/db dev:watch                   # rebuild packages/db on change while editing
vitest run path/to/file.test.ts                       # single test file (within a workspace)
```

## Tooling

- **Biome** for all JS/TS lint + format (not ESLint/Prettier). Config in `biome.json`: 2-space indent, 100-char width, single quotes, es5 trailing commas.
- **Prettier** for `.md`/`.mdx` only.
- **Commitlint** enforces Conventional Commits (`feat`, `fix`, `refactor`, etc.).
- **knip** and **madge** run in `pnpm ci` to catch unused exports and circular imports.

## Architecture

**`apps/web`** — Astro 6 static output; queries the database **directly at build time** via `@qafiyah/db` (see `src/lib/api/static.ts`). React is islands-only (search, nav, random poem). Path alias `@/*` → `src/*`. RTL Arabic layout in `src/layouts/Layout.astro`. No running API needed to build. Canonical URLs are non-trailing-slash (`trailingSlash: 'never'` + `build.format: 'directory'`); both `/page` and `/page/` resolve at the host, with the host 301-ing the trailing form to canonical.

**Web deployment** — Self-hosted on a VPS behind nginx. Build is produced locally (`pnpm --filter @qafiyah/web build`) and `apps/web/dist/` is rsynced to the server (default web root `/var/www/qafiyah`). Reference server block: `apps/web/nginx.conf` — handles www→apex, trailing-slash→canonical, `try_files $uri $uri/index.html`, and immutable caching for `/_astro/`. TLS is managed outside this file (certbot or a fronting reverse proxy).

**`apps/api`** — Hono on Cloudflare Workers. Drizzle ORM against Postgres (via `postgres` driver in `packages/db/src/client.ts`). Routes: `eras`, `meters`, `poems`, `poets`, `rhymes`, `themes`, `search`, `sitemaps`. `pnpm --filter @qafiyah/api build` runs `build:deps` (builds `packages/db`) before `wrangler build`. For dev servers, Turbo `dev`/`dev:test` runs `^build` first when invoked via `pnpm turbo`; otherwise run `build:deps` yourself.

**`apps/bot`** — Posts a random poem via `twitter-api-v2` on a GitHub Actions cron at 08/12/16/20 UTC (see `.github/workflows/post-poem.yml`). Exponential backoff, 3 retries.

**`packages/db`** — `tsup`-built Drizzle ORM schema, queries, and Postgres client shared by `apps/api` and `apps/web`. `dist/` is built on `pnpm install` (`prepare`) and before dev servers (`^build` in Turbo). While editing, use `pnpm --filter @qafiyah/db dev:watch`. `@qafiyah/api`'s `build` runs `build:deps`; its `dev`/`dev:test` rely on Turbo or a manual `build:deps` when invoked outside Turbo's `dev` graph.

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

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings in template expressions.
