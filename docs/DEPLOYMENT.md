# Deployment

## About This Document

This document covers the deployment process for all three Qafiyah apps. It is not a local development guide, use `bun run dev` for that. Each app is deployed independently with no shared pipeline.

## API (`apps/api`)

The API runs as a Bun + Hono server packaged in a Docker container (`apps/api/Dockerfile`). The full stack (Postgres, API, web) is orchestrated via `docker-compose.yml` at the repo root.

```bash
docker compose up -d --build
```

`DATABASE_URL` and `ENVIRONMENT` are injected into the `api` service by `docker-compose.yml` and read from `process.env` at runtime. No secrets are committed; set them as environment variables or in a `.env` file referenced by compose before the first deploy.

## Web (`apps/web`)

The web app is an Astro **server (SSR)** app, self-hosted on a VPS in a Docker container. Every route renders on-demand by calling the internal `api` container via the oRPC contract; nginx (bundled in the web image) caches the rendered HTML and serves built static assets from disk. There is no DB snapshot and no static `dist/` rsync.

### Build & deploy

```bash
docker compose up -d --build
```

The web image build runs `astro build` only — **no `DATABASE_URL` is needed at build time**. At runtime, `INTERNAL_API_URL` (set to `http://api:8787` in `docker-compose.yml`) points SSR at the `api` service over the internal compose network. `PUBLIC_API_URL` is unset, so the browser islands fall back to the production API.

To build only the web image: `docker compose build web`.

### Caching & freshness

Each route sets a `Cache-Control` TTL (poems 24h, collection lists/indexes 1h, sitemaps 24h; the 404 is `no-store`). nginx (`proxy_cache`) honors it, collapses concurrent misses (`proxy_cache_lock`), and serves stale on upstream errors / during background refresh. New or edited poems appear automatically within the TTL — no rebuild. nginx also canonicalizes www→apex and trailing slashes, and serves `/_astro/` immutably.

### Sitemap

`/sitemap-index.xml` is generated on-demand (poems sharded at 45k URLs/file, plus poets and collection landing pages) and cached like any other route. `public/robots.txt` references it.

### nginx & TLS

The full nginx config is checked in at `apps/web/nginx.conf` and baked into the web image at `/etc/nginx/nginx.conf` (it proxies HTML to the Astro server on `127.0.0.1:4321` and serves `/app/apps/web/dist/client` from disk). TLS is managed externally (certbot or a front reverse-proxy) and is intentionally absent from the config.

## Bot (`apps/bot`)

The bot has no manual deploy step. It runs entirely inside GitHub Actions on a cron schedule.

**Schedule** (UTC): `0 8`, `0 12`, `0 16`, `0 20`, four times daily (11:00, 15:00, 19:00, 23:00 KSA).

The workflow (`.github/workflows/post-poem.yml`) checks out `main`, installs dependencies with Bun, and runs `bun run start` inside `apps/bot`. The bot calls `/poems/random` on the production API and posts the result to X/Twitter.

### Required secrets

Configure these in the repository's GitHub Actions secrets:

| Secret                  | Description                 |
| ----------------------- | --------------------------- |
| `TWITTER_APP_KEY`       | OAuth 1.0a app key          |
| `TWITTER_APP_SECRET`    | OAuth 1.0a app secret       |
| `TWITTER_ACCESS_TOKEN`  | Account access token        |
| `TWITTER_ACCESS_SECRET` | Account access token secret |

The workflow can also be triggered manually via `workflow_dispatch`.
