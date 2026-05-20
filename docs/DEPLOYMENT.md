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

The web app is intentionally self-hosted on a VPS behind nginx to keep hosting costs minimal for an open-access project. There is no CDN or managed hosting layer.

### Build

```bash
bun --filter @qafiyah/web run build
```

The web image runs the DB snapshot at build time. Before building, `WEB_BUILD_DATABASE_URL` must point at a reachable Postgres instance (the default in compose points at the host-published `db` port). The build script pre-renders all static paths via oRPC against the API, then Astro writes the output to `apps/web/dist/`.

To build only the web image:

```bash
docker compose build web
```

### Deploy

```bash
rsync -av --delete apps/web/dist/ user@host:/var/www/qafiyah/
```

### nginx

The nginx configuration is checked in at `apps/web/nginx.conf`. When deploying via Docker Compose, the web image (`apps/web/Dockerfile`) bakes this file into the image at `/etc/nginx/conf.d/default.conf` — no manual VPS copy is needed.

If deploying the static `dist/` directly to a VPS without Docker, install it manually:

```bash
cp apps/web/nginx.conf /etc/nginx/sites-available/qafiyah.conf
ln -s /etc/nginx/sites-available/qafiyah.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Key rules the config enforces:

| Rule                            | Detail                                                                      |
| ------------------------------- | --------------------------------------------------------------------------- |
| www → apex redirect             | `301 $scheme://qafiyah.com$request_uri`                                     |
| Trailing-slash canonicalization | `rewrite ^/(.+)/$ /$1 permanent`                                            |
| Static file serving             | `try_files $uri $uri/index.html =404`                                       |
| Immutable asset caching         | `/_astro/` gets `Cache-Control: public, immutable, max-age=1y`              |
| UTF-8 charset                   | Declared explicitly for `text/plain` and other types nginx omits by default |

TLS is managed externally (certbot or reverse-proxy layer) and is intentionally absent from the config file.

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
