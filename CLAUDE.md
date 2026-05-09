# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qafiyah is an Arabic poetry repository (pnpm + Turborepo monorepo): `apps/web` (Astro 6 static site), `apps/api` (Hono on Cloudflare Workers + Neon Postgres), `apps/bot` (Twitter bot), `packages/db` (shared Drizzle), `packages/typescript`.

## Commands

```bash
pnpm dev             # turbo dev (^build builds @qafiyah/db before web/API servers)
pnpm build           # turbo build in dependency order
pnpm lint            # biome check --write .
pnpm format          # biome format + prettier (md/mdx only)
pnpm types           # tsc --noEmit all workspaces
pnpm test            # vitest all workspaces
pnpm db:setup        # first-time DB setup

pnpm turbo run dev --filter=@qafiyah/api              # (^build → db) then wrangler dev
pnpm turbo run dev:test --filter=@qafiyah/api         # (^build → db) then wrangler dev --env test
pnpm --filter @qafiyah/api build:deps && pnpm --filter @qafiyah/api dev   # standalone without Turbo's dev graph
pnpm --filter @qafiyah/api test       # vitest (API only)
```

## Tooling

- **Biome** for all JS/TS lint + format (not ESLint/Prettier). Config in `biome.json`: 2-space indent, 100-char width, single quotes, es5 trailing commas.
- **Prettier** for `.md`/`.mdx` only.
- **Commitlint** enforces Conventional Commits.

## Architecture

**`apps/web`** — Astro static output; queries the database directly at build time via `@qafiyah/db` (see `src/lib/api/static.ts`). React is islands-only (search, nav, random poem). Path alias `@/*` → `src/*`. RTL Arabic layout in `src/layouts/Layout.astro`.

**`apps/api`** — Hono on Cloudflare Workers. Drizzle ORM against Neon Postgres (via `postgres` driver). Routes: eras, meters, poems, poets, rhymes, themes, search, sitemaps. `pnpm --filter @qafiyah/api build` runs `build:deps` (builds `packages/db`) before `wrangler build`. For API dev servers, Turbo `dev`/`dev:test` runs `^build` first when invoked via `pnpm turbo`; otherwise run `build:deps` yourself (see Commands).

**`apps/bot`** — Posts a random poem via `twitter-api-v2` on a GitHub Actions cron (8am/12pm/4pm/8pm UTC). Exponential backoff, 3 retries.

**`packages/db`** — `tsup`-built Drizzle ORM queries and schema shared by `apps/api` and `apps/web`. `dist/` is built on `pnpm install` (`prepare`) and before dev servers (`^build` in Turbo). While editing, use `pnpm --filter @qafiyah/db dev:watch`. `@qafiyah/api` **`build`** still runs **`build:deps`**; the **`dev`** and **`dev:test`** scripts rely on Turbo or manual **`build:deps`** when invoked outside Turbo’s **`dev`** graph.

**`packages/typescript`** — Shared TypeScript configs (base, astro, cloudflare, node). Not published; referenced via workspace.

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

Use sparingly. Most code needs none. Avoid tagging obvious code.

## Session Discipline

- **One mission per session.** Don't mix unrelated tasks in the same thread.
- **If output goes wrong**, use ESC + ESC to return to the previous prompt, fix the instruction, and regenerate rather than patching on top of bad output.
- **Auto-compact is disabled.** When context fills, use `/export` → `/clear` → paste history to start fresh with full context rather than a lossy summary.
- **MCPs are on-demand.** Enable an MCP only for the task that needs it; disable when done to keep context lean.

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings in template expressions.
