# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qafiyah is an Arabic poetry repository (pnpm + Turborepo monorepo): `apps/web` (Astro 5 static site), `apps/api` (Hono on Cloudflare Workers + Neon Postgres), `apps/bot` (Twitter bot), `packages/schemas` (shared Zod), `packages/tsconfig`.

## Commands

```bash
pnpm dev             # database check, build @qafiyah/schemas, then Astro + API (wrangler)
pnpm build           # turbo build in dependency order
pnpm build:static    # apps/web only
pnpm lint / lint:fix # biome check [--write]
pnpm format          # biome format + prettier (md/mdx only)
pnpm types           # tsc --noEmit all workspaces
pnpm test            # vitest all workspaces
pnpm db:setup        # first-time DB setup

pnpm --filter @qafiyah/api dev        # wrangler dev
pnpm --filter @qafiyah/api dev:test   # wrangler dev --env test
pnpm --filter @qafiyah/api test       # vitest (API only)
```

## Tooling

- **Biome** for all JS/TS lint + format (not ESLint/Prettier). Config in `biome.json`: 2-space indent, 100-char width, single quotes, es5 trailing commas.
- **Prettier** for `.md`/`.mdx` only.
- **Commitlint** enforces Conventional Commits.

## Architecture

**`apps/web`** — Astro static output; all content is fetched at build time from `https://api.qafiyah.com` via `src/lib/api/static.ts`. React is islands-only (search, nav, random poem). Path alias `@/*` → `src/*`. RTL Arabic layout in `src/layouts/Layout.astro`.

**`apps/api`** — Hono on Cloudflare Workers. Drizzle ORM against Neon Postgres (`@neondatabase/serverless`). Routes: eras, meters, poems, poets, rhymes, themes, search, sitemaps. `build:deps` must run before `wrangler dev` (builds `packages/schemas`).

**`apps/bot`** — Posts a random poem via `twitter-api-v2` on a GitHub Actions cron (8am/12pm/4pm/8pm UTC). Exponential backoff, 3 retries.

**`packages/schemas`** — `tsup`-built Zod schemas with `main`/`client`/`server` entry points. `dist/` is built on `pnpm install` (`prepare`) and before `pnpm dev` at the repo root. While editing schemas, use `pnpm --filter @qafiyah/schemas dev:watch`. Apps also run `build:deps` (API) or depend on a prior `schemas` build for Wrangler/Astro.

## Quality Checklist (TRUST 5)

Before marking any task complete, verify all five:

| | Criterion | Gate |
|---|---|---|
| **T** | Tested | `pnpm test` passes; new logic has coverage |
| **R** | Readable | 0 lint errors (`pnpm lint`); names are self-explanatory |
| **U** | Unified | Matches repo style (Biome config, Conventional Commits) |
| **S** | Secured | No secrets in code; inputs validated at boundaries |
| **T** | Trackable | Commit message explains *why*, not just what |

## Code Annotations

Mark only code that will surprise a future reader. Three tags, inline only:

```ts
// @ANCHOR: <why this is a choke point> — used when 3+ callers depend on this contract
// @WARN: <danger> — goroutine-equivalent async, global mutation, non-obvious side-effect
// @NOTE: <context> — magic constant, workaround, constraint not visible from the code
```

Use sparingly. Most code needs none. Avoid tagging obvious code.

## Session Discipline

- **One mission per session.** Don't mix unrelated tasks in the same thread.
- **If output goes wrong**, use ESC + ESC to return to the previous prompt, fix the instruction, and regenerate rather than patching on top of bad output.
- **Auto-compact is disabled.** When context fills, use `/export` → `/clear` → paste history to start fresh with full context rather than a lossy summary.
- **MCPs are on-demand.** Enable an MCP only for the task that needs it; disable when done to keep context lean.

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings in template expressions.
