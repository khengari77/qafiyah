# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qafiyah is an Arabic poetry repository (pnpm + Turborepo monorepo): `apps/web` (Astro 5 static site), `apps/api` (Hono on Cloudflare Workers + Neon Postgres), `apps/bot` (Twitter bot), `packages/schemas` (shared Zod), `packages/tsconfig`.

## Commands

```bash
pnpm dev             # all apps (runs check-database.sh first)
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

**`packages/schemas`** — `tsup`-built Zod schemas with `main`/`client`/`server` entry points. Built before any app via turbo `dependsOn: ["^build"]`.

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings in template expressions.
