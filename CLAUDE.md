# CLAUDE.md

Qafiyah is an Arabic poetry monorepo (pnpm + Turborepo): `apps/web` (Astro 6 static), `apps/api` (Hono + oRPC on Cloudflare Workers), `apps/bot` (X/Twitter bot), `packages/db` (Drizzle + Postgres, API-only), `packages/contracts` (shared oRPC contracts), `packages/constants` (brand/URLs/ports), `packages/typescript` (shared tsconfigs).

## Commands

```bash
pnpm dev             # turbo dev (web + API)
pnpm build           # turbo build
pnpm lint            # biome check --write .
pnpm format          # biome + prettier (md/mdx)
pnpm types           # tsc --noEmit all workspaces
pnpm test            # vitest all workspaces
pnpm db:setup        # Docker Postgres on :5433, restored from latest dump
pnpm clean:dev       # kill orphan astro/wrangler/workerd processes
pnpm ci              # format + lint + types + test + knip + madge

pnpm --filter @qafiyah/api dev          # wrangler dev
pnpm --filter @qafiyah/api test         # vitest API only
vitest run path/to/file.test.ts         # single file
```

## Tooling

- **Biome**: all JS/TS lint + format. `biome.json`: 2-space, 100-char, single quotes, es5 commas.
- **Prettier**: `.md`/`.mdx` only.
- **Commitlint**: Conventional Commits (`feat`, `fix`, `refactor`, …).
- **knip** + **madge**: unused exports + circular imports (run in `pnpm ci`).

## Architecture

**`apps/web`** — Astro 6 static. Queries API at build time via `src/lib/api/static.ts` → `rpc.ts`. Build script (`scripts/build-with-api.mjs`) auto-starts Wrangler on :8787, sets `BUILD_API_URL=http://127.0.0.1:8787`, runs `astro build`, tears Wrangler down. `PUBLIC_API_URL` always points to prod for the browser bundle. React is islands-only (search, nav, random poem). Path alias `@/*` → `src/*`. RTL layout in `src/layouts/Layout.astro`. Non-trailing-slash canonical URLs; host 301s `/page/` → `/page`.

**Web deployment** — VPS + nginx. Build locally, rsync `apps/web/dist/` → `/var/www/qafiyah`. `apps/web/nginx.conf`: www→apex, trailing-slash→canonical, `try_files`, immutable `/_astro/` cache. TLS managed externally.

**`apps/api`** — Thin Hono layer over `@qafiyah/db`. No Drizzle/postgres imports in `apps/api/src`. Contracts in `packages/contracts`; implemented as oRPC procedures in `src/procedures/*.procedures.ts`, composed in `src/router.ts`, mounted via `OpenAPIHandler` in `src/app.ts`. `/poems/random` (plain text) and `/` stay as raw Hono routes. Web imports only types from the API; no API code ships to the browser.

**`packages/db`** — Drizzle views, query namespaces (`erasQueries`, `metersQueries`, `poemsQueries`, `poetsQueries`, `rhymesQueries`, `searchQueries`, `themesQueries`), `createDb(url)` factory, `DbClient` type, DB constants, and Arabic text utils (`cleanArabicQuery`, `parseIds`, `removeTashkeel`, `processPoemContent`, `extractPoemExcerpt`, `normalizeRhymePattern`). Source-only; bundled by Wrangler. Sole consumer is `apps/api`.

**`apps/bot`** — GitHub Actions cron (08/12/16/20 UTC). Calls `/poems/random`, posts via `twitter-api-v2`. Exponential backoff, 3 retries.

**`packages/constants`** — Source-only. Brand strings, prod URLs, dev ports (`DEV_WEB_PORT=4321`, `DEV_API_PORT=8787`). Always update here, not in app code.

**`packages/typescript`** — Shared tsconfigs (`base`, `astro`, `cloudflare`, `node`). Workspace-only.

## Quality Checklist (TRUST 5)

|       | Criterion | Gate                                               |
| ----- | --------- | -------------------------------------------------- |
| **T** | Tested    | `pnpm test` passes; new logic has coverage         |
| **R** | Readable  | 0 lint errors; self-explanatory names              |
| **U** | Unified   | Matches Biome config + Conventional Commits        |
| **S** | Secured   | No secrets in code; inputs validated at boundaries |
| **T** | Trackable | Commit message explains _why_                      |

## Code Annotations

```ts
// @ANCHOR: <why> — 3+ callers depend on this contract
// @WARN: <danger> — async side-effect, global mutation
// @NOTE: <context> — magic constant, workaround
```

Use sparingly. Most code needs none.

## Session Discipline

- **One mission per session.**
- **Port conflicts:** `pnpm clean:dev`, then restart. `scripts/check-port.mjs` guards against silent rebinding.
- **DB dumps:** `dumps/` (newest = latest). `pnpm db:setup` restores the newest dump into Docker Postgres on :5433.
- **Web build is ~2 hours.** To verify without a full build: run `pnpm --filter @qafiyah/web build` in the background, kill after ~20s (enough for Wrangler + first `getStaticPaths` errors to surface), then `pnpm clean:dev`. Only run to completion for a deployable build.

## Known Bug

`@astrojs/compiler@2.13.1` crashes on `"` inside `${}` in Astro templates. Use helper functions instead of inline quoted strings.
