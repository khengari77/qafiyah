# Deployment

## About This Document

Production deployment of the three Qafiyah apps. This is not a local development guide — use `bun run dev` for that. The **API and web deploy together** via Docker Compose on a VPS; the **bot** runs in GitHub Actions.

## Prerequisites (VPS)

1. **Docker + Docker Compose**, with the repo checked out on the host.

2. **A root `.env` file.** Compose auto-loads it for `${VAR}` interpolation in `docker-compose.yml`. Copy the template and set real values:

   ```bash
   cp .env.example .env
   # edit POSTGRES_PASSWORD at minimum
   ```

   The API's `DATABASE_URL` is composed from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`. With no `.env` the `qafiyah` dev defaults apply, so **set a real `POSTGRES_PASSWORD` for production.** (Local dev needs no `.env` — the defaults are intended.)

3. **Cloudflare Tunnel** (or equivalent) for ingress and TLS. Every published port binds to **`127.0.0.1`** — nothing answers on the public interface — so the tunnel must reach the services over loopback:
   - web → `http://127.0.0.1:80`
   - api (`api.qafiyah.com`, also called by the bot) → `http://127.0.0.1:8787`

## Bring up the stack

```bash
docker compose up -d --build
```

Builds and starts `db` + `api` + `web`, each gated on the previous service's healthcheck (`db` healthy → `api` healthy → `web`).

**First boot only:** on an empty data volume, Postgres auto-restores the newest dump from `dumps/` via `scripts/db-init.sh`. This can take a few minutes — the `db` healthcheck's `start_period` is 300s to cover it. Later boots reuse the volume. To wipe and re-seed: `bun run db:reset`.

## API (`apps/api`)

Bun + Hono server (`apps/api/Dockerfile`): a multi-stage, devDependency-pruned image that runs **non-root** (the `bun` user) with `tini` as PID 1. It reads `DATABASE_URL` / `ENVIRONMENT` / `PORT` from `process.env` (injected by compose). The healthcheck hits `GET /v1/docs`, a 200 that never touches the DB. Published on `127.0.0.1:8787`.

## Web (`apps/web`)

Astro **server (SSR)** app. Every route renders on demand by calling the internal `api` container via the oRPC contract (`INTERNAL_API_URL=http://api:8787`); nginx — bundled in the image — caches the rendered HTML and serves built static assets from disk. `PUBLIC_API_URL` is unset, so browser islands fall back to the production API.

The image build runs `astro build` only — **no `DATABASE_URL` at build time.** The serve image is **fully non-root**: nginx and the Bun SSR origin both run as the `nginx` user under `tini`. nginx listens on **8080**, and compose maps host `127.0.0.1:80` → container `8080`. The entrypoint runs both processes and **exits if either dies**, so `restart: unless-stopped` recovers a crashed origin. Build just this image with `docker compose build web`.

### Caching & freshness

Each route sets a `Cache-Control` TTL (poems 24h; collection lists/indexes 1h; sitemaps 24h; the 404 is `no-store`). nginx (`proxy_cache`) honors it, collapses concurrent misses (`proxy_cache_lock`), and serves stale on upstream errors or during background refresh. New or edited poems appear within the TTL — no rebuild. nginx also canonicalizes www→apex and trailing slashes, gzips text responses, and serves `/_astro/` immutably.

### Sitemap

`/sitemap-index.xml` is generated on demand (poems sharded at 45k URLs/file, plus poets and collection landing pages) and cached like any other route. `public/robots.txt` references it.

### nginx & TLS

The full config is checked in at `apps/web/nginx.conf` and baked into the image at `/etc/nginx/nginx.conf`. It proxies HTML to the Astro origin on `127.0.0.1:4321`, serves `/app/apps/web/dist/client` from disk, and answers a container-local `/healthz`. TLS is terminated upstream by Cloudflare; the config is plain HTTP on `8080` by design.

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
