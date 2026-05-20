# Web On-Demand SSR — Design

**Date:** 2026-05-20
**Target:** `apps/web` (Astro 6, Bun + Turborepo) and its Docker container
**Goal:** Replace the ~16-min full static build + DB snapshot with on-demand SSR rendering through the existing API, behind an nginx `proxy_cache`. Build drops to ~seconds, `apps/web` stops touching the DB, and there is **one data path** (the oRPC contract) for both browser and server.

---

## 1. Background

`apps/web` is an Astro 6 site that today emits ~100k static HTML pages. The current pipeline (added 2026-05-19, containerized 2026-05-20):

1. `apps/web/scripts/build.ts` runs `generate-snapshot.ts`, which imports `@qafiyah/db` directly (`createDb`, 20-conn pool), runs ~10 bulk queries plus a per-poem `getPoemBySlug` over all slugs at concurrency 20, and dumps ~12 JSON files into `apps/web/.data/`.
2. `astro build` (`output: 'static'`) pre-renders every route from those JSON files via `src/lib/data/*` (a `readFileSync` + memo loader and domain accessors).
3. The web Docker image runs steps 1–2 at **image-build time** (needs `WEB_BUILD_DATABASE_URL`), then serves `dist/` from nginx.

Measured cost: snapshot ~7 min (dominated by ~100k `getPoemBySlug` calls) + `astro build` ~5–10 min ≈ **~16 min**.

### Why the current shape exists (and what it means for this change)

The pipeline _before_ the snapshot did ~100k **HTTP** fetches at build time against a local Wrangler and took ~2 h. The snapshot was built specifically to kill that build-time HTTP bulk. This design returns to "talk to the API" — but at **request** time, where it is 1 fetch per page, spread over real traffic and cached, not 10⁵ fetches at once. That is a fundamentally different regime and is the reason the API path is correct now when it was wrong as a build step.

### Pain this solves

- **Build latency.** ~16 min for any change (even unrelated). On-demand makes the build ~seconds (`astro build` of the server bundle only).
- **Boundaries.** `apps/web` currently has two data paths: a build-time DB reader (`@qafiyah/db` + snapshot + `src/lib/data/*`) and a browser API client (`apiBrowser`). The snapshot machinery (`generate-snapshot.ts` ~470 lines, the `.data/` loader, the dual access pattern) is the "mess." This collapses to one path: the oRPC contract.
- **Freshness.** New/edited poems require a full rebuild + redeploy today. On-demand surfaces changes automatically after a cache TTL.
- **Build secrets.** The web image build no longer needs `DATABASE_URL` (it currently lands in the build stage's image history — see `docs/DEPLOYMENT.md`).

### Confirmed: the API already exposes everything the pages need

From `apps/api/src/router.ts` + `packages/contracts`:

| Contract call                                               | Route                             | Output envelope                                         | Errors                                      |
| ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `eras.list` / `meters.list` / `rhymes.list` / `themes.list` | `GET /v1/{e}`                     | `listResponse(slugWithCounts)`                          | `INTERNAL_SERVER_ERROR`                     |
| `eras.listPoems` / … `themes.listPoems`                     | `GET /v1/{e}/{slug}/poems`        | `listResponseWithMeta(poemListItem, slugWithPoemCount)` | `NOT_FOUND` (404), input/500                |
| `poets.list`                                                | `GET /v1/poets` (input `{page?}`) | `listResponse(slugWithPoemCount)`                       | `NOT_FOUND` (404)                           |
| `poets.listPoems`                                           | `GET /v1/poets/{slug}/poems`      | `listResponseWithMeta(poemListItem, slugWithPoemCount)` | `NOT_FOUND` (404)                           |
| `poems.listPoemSlugs`                                       | `GET /v1/poems/slugs`             | `listResponse(poemSlug)` — **all** slugs in one call    | `INTERNAL_SERVER_ERROR`                     |
| `poems.getPoemBySlug`                                       | `GET /v1/poems/{slug}`            | `resourceResponse(poemDetail)`                          | `NOT_FOUND` (404), `POEM_PARSE_ERROR` (500) |
| `search.search`                                             | `GET /v1/search`                  | —                                                       | (browser only)                              |

Envelope shapes (`packages/contracts/src/schemas.ts`): `listResponse(item) = { data: item[], pagination }`, `listResponseWithMeta(item, meta) = { data: item[], pagination, meta }`, `resourceResponse(item) = { data: item }`, `pagination = { page, pageSize, totalPages, totalItems }`.

**Consequence:** this change touches `apps/web` and the web container only. `apps/api`, `packages/db`, `packages/contracts`, `packages/constants` are **untouched**. The `poemDetail` contract type is exactly the `Poem` type that `src/lib/poem-page.ts` (`buildPoemPage`) already consumes, so SSR data flows into the existing render code with no shape adaptation.

---

## 2. Goal & non-goals

**Goal.** Render every route on-demand via the API at request time, cached by nginx so repeat hits cost nothing extra, while preserving the existing HTML output, SEO metadata, JSON-LD, canonical URLs, and React-islands behavior.

**Non-goals (this iteration).**

- Changing `apps/api`, `packages/*`, or the DB. The API is sufficient as-is.
- Changing the browser islands (`SearchWithProviders`, `RandomPoemButton`). They keep calling the **production** API via `apiBrowser`.
- Incremental static builds. Obsolete once rendering is on-demand.
- A CDN. Caching stays on the VPS in the web container's nginx (per the chosen serving model).
- Replacing `envin`, oRPC, Valibot, or the contract.
- Touching the hardcoded search-filter arrays (`ERAS_OPTIONS` etc. in `src/constants.ts`) — they are browser-side and unrelated.

---

## 3. Architecture

### 3.1 Request flow

```
Browser ─▶ nginx :80                       (single web container)
            ├─ /_astro/* , fonts, favicon, robots.txt, manifest, images
            │     └─▶ served from disk (dist/client), /_astro/ immutable 1y
            └─ everything else
                  └─▶ proxy_cache "astro"
                        ├─ HIT  ─▶ cached HTML (no render)
                        └─ MISS ─▶ 127.0.0.1:4321   Astro standalone server (Bun)
                                       │ oRPC (OpenAPILink) → http://api:8787/v1
                                       ▼
                                     api ─▶ db
```

- **Browser islands** (search, random-poem) still fetch from `https://api.qafiyah.com` (`apiBrowser`), independent of SSR. Unchanged.
- **SSR frontmatter** fetches from the internal `api` container over the compose network (`apiServer`).

### 3.2 Container topology — single `web` container, two processes

Stays at three services: `db | api | web`. The `web` image bundles nginx + the Astro Bun server:

```
web image (oven/bun:alpine + nginx + tini)
  /usr/share/nginx/html ← dist/client (static assets)
  /app/dist/server/entry.mjs ← Astro standalone server
  ENTRYPOINT tini → docker-entrypoint.sh:
      HOST=127.0.0.1 PORT=4321 bun /app/dist/server/entry.mjs &   # SSR origin
      exec nginx -g 'daemon off;'                                  # PID-forwarded front
```

`tini` is PID 1 for signal forwarding + zombie reaping. The entrypoint backgrounds the Bun server and execs nginx in the foreground. (Two processes in one container is a deliberate, well-trodden pattern for "app server + cache/static front"; it keeps the topology and the self-contained image from the just-completed containerization.)

### 3.3 Key shifts vs. today

1. `output: 'static'` → `output: 'server'` with `@astrojs/node` (standalone), run under Bun.
2. `getStaticPaths` (build-time enumeration) → per-request frontmatter `await` against `Astro.params`.
3. `src/lib/data/*` (snapshot readers) → `src/lib/server/*` (API-backed async accessors).
4. nginx static file-server → nginx reverse-proxy + `proxy_cache` (still serving built static assets from disk).
5. `@astrojs/sitemap` (build-time route enumeration) → dynamic, cached sitemap routes.
6. Web build needs no DB; the runtime depends on the `api` container.

---

## 4. Components

### 4.1 `apps/web/astro.config.mjs`

```js
import node from '@astrojs/node'
import react from '@astrojs/react'
import { PROD_SITE_URL } from '@qafiyah/constants'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: PROD_SITE_URL,
  integrations: [react()], // @astrojs/sitemap removed
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
})
```

👉 **Decision: `@astrojs/node` standalone, executed by Bun** (`bun dist/server/entry.mjs`), consistent with the `api` image. A Dockerfile smoke test (server boots + serves) gates this; documented fallback is a `node`-base serve stage if a Bun runtime incompatibility appears. Low risk — the node adapter is widely Bun-compatible.

### 4.2 Server-only data layer — `src/lib/server/` (NEW)

A clean execution-context boundary. Nothing here may be imported by a client island (enforced by review + the existing knip/madge CI; add a grep check if a regression occurs).

- **`client.ts`** — the internal API client, mirroring `src/lib/api/rpc.ts`'s `apiBrowser` but pointed at the container:

  ```ts
  import { createORPCClient } from '@orpc/client'
  import type { ContractRouterClient } from '@orpc/contract'
  import { OpenAPILink } from '@orpc/openapi-client/fetch'
  import { API_V1_PREFIX } from '@qafiyah/constants'
  import { type AppContract, contract } from '@qafiyah/contracts'
  import { INTERNAL_API_URL } from '@/env'

  const SERVER_BASE_URL = `${INTERNAL_API_URL}${API_V1_PREFIX}`
  export const apiServer: ContractRouterClient<AppContract> = createORPCClient(
    new OpenAPILink(contract, { url: SERVER_BASE_URL })
  )
  ```

- **`poems.ts`**, **`collections.ts`**, **`poets.ts`** — async accessors that wrap `apiServer`, unwrap the envelope `data`/`pagination`/`meta`, and return the same domain shapes the pages already use. They keep the same names as today's `src/lib/data/*` accessors so page bodies stay close:
  - `getPoem(slug): Promise<Poem | null>` — `poems.getPoemBySlug`; `null` on `NOT_FOUND`.
  - `getEraPoemsPage(slug, page)` / `getMeterPoemsPage` / `getRhymePoemsPage` / `getThemePoemsPage` → `{ poems, <entity>, pagination } | null`.
  - `getPoetPoemsPage(slug, page)` → `{ poems, poet, pagination } | null`.
  - `allEras()` / `allMeters()` / `allRhymes()` / `allThemes()` → entity list (for the index pages).
  - `getPoetsPage(page)` → `{ poets, pagination } | null` (for `/poets/page/[page]`).
- **Error convention.** Use oRPC's `safe()` (or a try/catch on `ORPCError`) so a _defined_ `NOT_FOUND` becomes a `null` return (the expected-fallible case → page renders 404). Any other error (transport failure, 500, `POEM_PARSE_ERROR`) **throws** — it is genuinely unexpected; the SSR response 5xxs and nginx serves stale if available. This matches the project rule: Result/typed-miss for fallible logic, throw for the truly unexpected.
- **No `@qafiyah/db` import anywhere under `apps/web`** after this change.

### 4.3 Page rewrites (11 `.astro` routes)

All pages drop `getStaticPaths`, read `Astro.params`, `await` the accessor, branch on `null → 404`, and set `Cache-Control`. The render bodies (markup, JSON-LD, `buildPoemPage`, breadcrumbs, pagination nav) are unchanged.

**Dynamic, parameterized (7):**

| File                                    | Accessor                        | 404 when                    |
| --------------------------------------- | ------------------------------- | --------------------------- |
| `pages/poems/[slug].astro`              | `getPoem(slug)`                 | unknown slug                |
| `pages/poets/page/[page].astro`         | `getPoetsPage(page)`            | page out of range           |
| `pages/poets/[slug]/page/[page].astro`  | `getPoetPoemsPage(slug, page)`  | unknown poet / out of range |
| `pages/eras/[slug]/page/[page].astro`   | `getEraPoemsPage(slug, page)`   | unknown era / out of range  |
| `pages/meters/[slug]/page/[page].astro` | `getMeterPoemsPage(slug, page)` | unknown / out of range      |
| `pages/rhymes/[slug]/page/[page].astro` | `getRhymePoemsPage(slug, page)` | unknown / out of range      |
| `pages/themes/[slug]/page/[page].astro` | `getThemePoemsPage(slug, page)` | unknown / out of range      |

Pattern (illustrated with `/poems/[slug]`):

```astro
---
import { CACHE_POEM } from '@/lib/server/cache';
import { getPoem } from '@/lib/server/poems';
import { buildPoemPage } from '@/lib/poem-page';
import { renderNotFound } from '@/lib/server/not-found';

const { slug } = Astro.params;
const detail = slug ? await getPoem(slug) : null;
if (!detail) return renderNotFound(Astro);     // sets status 404 + renders 404 body
Astro.response.headers.set('Cache-Control', CACHE_POEM);
const { poem, layout } = buildPoemPage(detail, slug);
---
<Layout {...layout} ogType="article"><PoemDisplay client:idle {...poem} /></Layout>
```

Out-of-range pagination: the accessor computes `totalPages` from the envelope `pagination` and returns `null` when `page < 1 || page > totalPages` (so deep/garbage pages 404 instead of rendering empty), matching today's `getStaticPaths` which only emitted valid pages.

**Index / dataless (4):**

| File                                              | Change                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pages/eras/index.astro` (+ meters/rhymes/themes) | `const eras = allEras()` → `await allEras()`; set `Cache-Control: CACHE_INDEX`. |
| `pages/index.astro`                               | No data fetch; set `Cache-Control: CACHE_INDEX`.                                |
| `pages/404.astro`                                 | Set `Cache-Control: no-store`; ensure status 404 (see below).                   |

**404 mechanism.** Extract the not-found body into a shared snippet/component so both `404.astro` and `renderNotFound(Astro)` use it. `renderNotFound` sets `Astro.response.status = 404` and renders the 404 layout (via `Astro.rewrite('/404')` or direct render — the plan picks one and a test asserts both the 404 status and the Arabic not-found copy). Astro's root `404.astro` continues to catch genuinely unmatched routes automatically.

### 4.4 Dynamic sitemap — `src/pages/sitemap*` (NEW; replaces `@astrojs/sitemap`)

All SSR routes emitting `application/xml`, cached by nginx like everything else.

- **`/sitemap-index.xml`** — fetches counts (poem slug count, poet count, the entity lists) and lists child sitemaps: `ceil(poems / 45000)` poem shards, `ceil(poets / 45000)` poet shards, and one sitemap each for era/meter/rhyme/theme landing pages.
- **`/sitemap/poems/[page].xml`** — `poems.listPoemSlugs` (all slugs), `slice((page-1)*45000, page*45000)`, emit `<url><loc>{SITE}/poems/{slug}</loc></url>`. (45k < the 50k-URL sitemap limit.)
- **`/sitemap/poets/[page].xml`** — `poets.list({page})` paged; emit `/poets/{slug}/page/1` landing URLs.
- **`/sitemap/collections.xml`** — era/meter/rhyme/theme `/…/{slug}/page/1` landing URLs from the `*.list` calls, plus the static index routes (`/`, `/eras`, `/meters`, `/rhymes`, `/themes`, `/poets/page/1`).

`lastmod` is optional (render time). `public/robots.txt` is updated to reference `Sitemap: https://qafiyah.com/sitemap-index.xml`.

### 4.5 `apps/web/nginx.conf` → full container config

Today `nginx.conf` is a bare `server {}` block for static file-serving. It becomes a **full** config (http + server) for the container, since `proxy_cache_path` must live in `http {}`:

```nginx
proxy_cache_path /var/cache/nginx/astro levels=1:2 keys_zone=astro:10m
                 max_size=1g inactive=24h use_temp_path=off;

server {
  listen 80;
  server_name qafiyah.com www.qafiyah.com;
  root /usr/share/nginx/html;          # dist/client
  charset utf-8;
  charset_types text/plain text/css text/xml application/javascript
                application/json application/xml image/svg+xml;

  if ($host = www.qafiyah.com) { return 301 $scheme://qafiyah.com$request_uri; }
  rewrite ^/(.+)/$ /$1 permanent;       # trailing slash → none

  # Content-hashed assets: serve from disk, cache forever.
  location /_astro/ { expires 1y; add_header Cache-Control "public, immutable"; try_files $uri =404; }

  # Static-from-disk if the file exists (favicon, fonts, robots.txt, manifest, images),
  # otherwise hand off to the SSR origin.
  location / { try_files $uri @astro; }

  location @astro {
    proxy_pass http://127.0.0.1:4321;
    proxy_set_header Host $host;
    proxy_cache astro;
    proxy_cache_key "$scheme$host$uri";          # path only — query never fragments/poisons cache
    proxy_cache_lock on;                          # collapse concurrent misses for the same key
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;             # SWR: serve stale, refresh in background
    add_header X-Cache-Status $upstream_cache_status;   # for tests/observability
    # TTL is taken from the upstream Cache-Control the page sets (proxy_ignore_headers NOT set).
  }
}
```

Notes:

- No `error_page` directive is needed: every non-asset path falls through `try_files … @astro` to the SSR server, which renders `404.astro` with a 404 status; a missing `/_astro/` asset returns a plain nginx 404 (an asset/build bug if it happens).
- **TTL lives in Astro responses** (`Cache-Control: max-age=…`), which nginx honors per-route. nginx's _stale_-serving is configured here (`use_stale` + `background_update`), since native nginx does not read `stale-while-revalidate` from `Cache-Control` (that directive still benefits browsers/any future CDN).
- The site sets no cookies, so responses are publicly cacheable; `no-store` (the 404) is not cached.
- The "drop `nginx.conf` into `sites-enabled` on a bare VPS" usage documented in `DEPLOYMENT.md` no longer applies (SSR needs the running server). Documented in §8.

### 4.6 `apps/web/Dockerfile` (multi-stage; rewritten)

```dockerfile
# syntax=docker/dockerfile:1
# Build context = repo root.

# --- Build stage: astro build (NO DB, NO snapshot) ---
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN cd apps/web && bun run build      # = astro build → dist/{server,client}

# --- Serve stage: nginx + Bun SSR server ---
FROM oven/bun:1.3.14-alpine AS serve
RUN apk add --no-cache nginx tini
WORKDIR /app
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/node_modules ./node_modules   # SSR runtime deps
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
 && cp -r ./dist/client/* /usr/share/nginx/html/
ENV HOST=127.0.0.1 PORT=4321
EXPOSE 80
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
```

`apps/web/docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e
HOST="${HOST:-127.0.0.1}" PORT="${PORT:-4321}" bun /app/dist/server/entry.mjs &
exec nginx -g 'daemon off;'
```

(The exact `node_modules` copy vs. a `bun install --production` in the serve stage is a plan-time size/correctness call; the standalone server bundles most of its graph but external deps may still be resolved at runtime.)

### 4.7 `docker-compose.yml` — `web` service

```yaml
web:
  build:
    context: .
    dockerfile: apps/web/Dockerfile # no DATABASE_URL build arg anymore
  container_name: qafiyah-web
  restart: unless-stopped
  depends_on:
    db:
      condition: service_healthy
    api:
      condition: service_started
  environment:
    INTERNAL_API_URL: http://api:8787 # compose-internal origin for SSR
  ports:
    - '80:80'
```

`PUBLIC_API_URL` is intentionally unset — `src/constants.ts` already falls back to `PROD_API_URL` for the browser, and it is build-time inlined, so no build arg is needed.

### 4.8 `apps/web/src/env.ts`

Add a server-only variable read from `process.env` at **runtime** (distinct from the build-inlined client `PUBLIC_API_URL`):

```ts
// client: PUBLIC_API_URL from import.meta.env (browser, build-inlined) — unchanged.
// server: INTERNAL_API_URL from process.env (runtime, container env).
export const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? `http://localhost:${DEV_API_PORT}` // 8787 in dev
```

Validated via `envin`/Valibot as a URL, defaulting to the local API dev server (`http://localhost:8787`) so `astro dev` works against `bun --filter @qafiyah/api run dev`. The build-vs-runtime source split is the one real subtlety here (see §7).

### 4.9 `apps/web/package.json`

- **Remove:** `@qafiyah/db` (devDep), `@astrojs/sitemap`, `serve` (devDep + script).
- **Add:** `@astrojs/node`.
- **Scripts:** `build` → `astro build` (drop `scripts/build.ts`); remove `build:raw`; `dev` → `astro dev` (already on-demand; keep the `check-port` guard); `start`/`preview` → run the standalone server (`astro preview` runs it under the node adapter); `verify:seo` → see §5.

---

## 5. Tests (TDD)

- **`src/lib/server/*.test.ts`** — mock the oRPC/network boundary (this is a true boundary — web no longer imports `@qafiyah/db` at all, so the prior "don't mock `@qafiyah/db`" feedback is moot here). Assert: envelope → domain mapping for each accessor; `NOT_FOUND` → `null`; out-of-range page → `null`; unexpected error → throw.
- **Sitemap route tests** — valid XML, correct `<loc>` URLs, sharding boundaries (e.g. 90k slugs → 2 poem shards), index lists the right children.
- **404 test** — unknown slug yields HTTP 404 with the Arabic not-found body.
- **Cache-Control test** — each route type sets the expected `Cache-Control`.
- **Delete** `src/lib/data/*.test.ts` (loader/poems/poets/collections) — that layer is gone.
- **`verify-seo.ts` reworked** — instead of walking `dist/*.html` (no longer exists), it fetches a representative sample against a running server (`PREVIEW_URL`): `/`, one of each index, one poem, one paginated list of each kind, `/404`, and `/sitemap-index.xml`. The same `<head>`/JSON-LD/single-`<h1>` invariants apply (one URL per template proves the template). Run in CI against the running stack.
- **Dockerfile smoke test** (in the plan's verification task): build the image, `docker run`, then assert `/`→200, repeat hit `X-Cache-Status: HIT`, `/_astro/*` immutable, `/x/`→301, `www.`→301 apex, unknown poem→404, `/sitemap-index.xml`→200 `application/xml`, and the SSR server boots under Bun.

---

## 6. Caching & freshness

TTLs are owned by the Astro page responses (one constant per route class in `src/lib/server/cache.ts`); nginx honors them and adds stale-serving. Defaults (👉 confirmed, easily tuned):

| Route class                                                                                                    | `max-age`   | `stale-while-revalidate` | Constant        |
| -------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------ | --------------- |
| `/poems/[slug]`                                                                                                | 24h (86400) | 7d (604800)              | `CACHE_POEM`    |
| collection lists (`/{eras,meters,rhymes,themes}/[slug]/page/[n]`, `/poets/[slug]/page/[n]`, `/poets/page/[n]`) | 1h (3600)   | 24h                      | `CACHE_LIST`    |
| index pages (`/`, `/eras`, `/meters`, `/rhymes`, `/themes`)                                                    | 1h (3600)   | 24h                      | `CACHE_INDEX`   |
| `/sitemap*`                                                                                                    | 24h         | 7d                       | `CACHE_SITEMAP` |
| `/404`                                                                                                         | `no-store`  | —                        | `CACHE_NONE`    |

Behavior: first hit renders (API → DB) and caches; repeat hits within `max-age` are served by nginx with no render; after expiry, `proxy_cache_background_update` serves the stale copy instantly and refreshes in the background; on upstream error nginx serves stale (`proxy_cache_use_stale`). New poems / edits go live within `max-age` with no deploy.

---

## 7. Risks & mitigations

- **API/DB is now a runtime hard-dependency of web** (was build-time only). If `api`/`db` is down, content pages 5xx — _mitigated_ by `proxy_cache_use_stale` (serve stale during upstream errors), `restart: unless-stopped`, and the `db` healthcheck/`depends_on`. The home and 404 pages have no data dependency and stay up regardless. This is the central tradeoff of leaving pure-static and is accepted.
- **Cold-cache first hit**, especially crawlers sweeping cold long-tail URLs — _mitigated_ by `proxy_cache_lock` (one render per key under concurrency), SWR, and the API's per-process db-cache (`db.middleware.ts`). Search engines do not fetch all 100k at once; each long-tail page renders once then caches.
- **`@astrojs/node` under Bun** runtime edge cases — _mitigated_ by the Dockerfile smoke test; documented fallback to a `node`-base serve stage.
- **Env source split** (`INTERNAL_API_URL` from `process.env` at runtime vs. `PUBLIC_API_URL` build-inlined) — a classic Astro footgun; called out in `env.ts` comments and covered by a server-accessor test that asserts the base URL resolves from `process.env`.
- **Two-process container & signals** — `tini` as PID 1 handles forwarding/reaping; the smoke test asserts clean startup; `restart` policy covers a crashed SSR process.
- **Cache key & query strings** — keying on `$uri` (path only) means `?q=`, UTM, etc. never fragment or poison the cache; safe because no SSR route varies on query (the home page's `?q=` is read client-side by the search island).
- **Sitemap size** — shards capped at 45k URLs (< 50k limit); each shard cached 24h; `robots.txt` points at the index.
- **SEO parity** — SSR reuses the exact `Layout`/`seo.astro`/`buildPoemPage` code, so emitted HTML is equivalent; `verify-seo` (reworked to crawl the server) is the gate.

---

## 8. Deploy & docs impact

- **The "build `dist/` locally + rsync to a bare nginx VPS" path is removed.** SSR requires the running Bun server; web is deployed via the container (`docker compose up -d --build`). `docs/DEPLOYMENT.md` Web section is rewritten: no snapshot, no `WEB_BUILD_DATABASE_URL`, no rsync; the web image now bundles nginx (cache/static/canonicalization) + the SSR server, with `INTERNAL_API_URL` wired in compose.
- `CLAUDE.md` "Architecture → apps/web" and "Web deploy" paragraphs and the "Web build is ~10–15 min" session note are rewritten for on-demand SSR.
- The auto-memory `project_web_deployment` (rsync/static) and `project_web_via_orpc` become outdated and should be updated after implementation: web now renders on-demand via the internal API container; deploy is container-only.

---

## 9. Boundaries & invariants

- **One data path.** Both browser (`apiBrowser` → prod) and server (`apiServer` → internal container) go through the same `@qafiyah/contracts` oRPC contract. No `@qafiyah/db` import under `apps/web`.
- **Execution-context separation.** `src/lib/api/*` = browser-facing (prod API). `src/lib/server/*` = SSR-only (internal API), never imported by an island.
- **API/packages untouched.** No changes to `apps/api`, `packages/db`, `packages/contracts`, `packages/constants`.
- **Output equivalence.** Rendered HTML, canonical URLs (non-trailing-slash), JSON-LD, and SEO metadata match today's static output; `verify-seo` enforces it.

---

## 10. Out of scope

- `apps/api`, `packages/*`, the DB.
- Browser islands (search, random-poem) and the hardcoded search-filter arrays.
- Incremental builds (obsolete).
- A CDN / external edge cache.
