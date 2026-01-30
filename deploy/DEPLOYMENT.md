# Deployment Guide (Hetzner VPS)

This guide covers deploying the static Next.js site to a Hetzner VPS using Docker nginx. The web app is built locally and served on the VPS; the API remains on Cloudflare Workers.

## Overview

- **Build:** Local machine (Postgres in Docker + API via wrangler + Next.js static export).
- **Serve:** VPS runs only nginx in Docker; no database on the VPS.
- **API:** Production API at `api.qafiyah.com` (Cloudflare Worker); unchanged by this deployment.
- **Transfer:** `rsync` for config and static files from repo to VPS.

## Prerequisites

- Local: Docker, Docker Compose, Node.js, pnpm.
- VPS: Docker and Docker Compose installed, SSH access with keys.
- Domain/DNS: Handled separately (e.g. Cloudflare proxy to VPS).

## One-time VPS setup

On the VPS, create the deployment directory and set ownership:

```bash
sudo mkdir -p /var/www/qafiyah/web/out
sudo chown -R $USER:$USER /var/www/qafiyah

# Verify
ls -la /var/www/qafiyah
```

## Monthly deployment workflow

### 1. Start local services

**Terminal 1 – Postgres:**

```bash
# From repo root
docker compose up -d postgres
```

**Terminal 2 – API:**

```bash
# From repo root
pnpm --filter @qafiyah/api dev
```

Wait until you see: `Ready on http://localhost:8787`.

### 2. Build static site

**Terminal 3 (from repo root):**

```bash
pnpm build:static
```

Wait for the build to finish (e.g. "Route (app) ... exported"). Output is in `apps/web/out/`.

### 3. Deploy to VPS

Replace `YOUR_VPS` with your SSH target (e.g. `user@1.2.3.4` or a host from `~/.ssh/config`).

**Deploy config (docker-compose + nginx):**

```bash
rsync -avz --delete --exclude='web/out/' deploy/ YOUR_VPS:/var/www/qafiyah/
```

**Deploy static files:**

```bash
rsync -avz --delete apps/web/out/ YOUR_VPS:/var/www/qafiyah/web/out/
```

**rsync flags:**

| Flag      | Meaning |
|-----------|---------|
| `-a`      | Archive (recursive, preserves permissions/timestamps) |
| `-v`      | Verbose |
| `-z`      | Compress during transfer |
| `--delete`| Remove files on VPS that no longer exist locally |
| `--exclude='web/out/'` | When syncing config, do not delete `web/out/` on the VPS |

### 4. On the VPS

**First deployment or after pulling new config:**

```bash
ssh YOUR_VPS
cd /var/www/qafiyah
docker compose up -d
```

**Verify:**

```bash
docker compose ps
curl http://localhost
```

**After config changes only** (e.g. `nginx.conf` or `docker-compose.yml`):

```bash
cd /var/www/qafiyah
docker compose up -d --force-recreate
```

**After only static file updates:**  
No restart needed; nginx serves the updated files from the mounted volume.

## VPS directory structure

```
/var/www/qafiyah/
├── docker-compose.yml   # From deploy/docker-compose.yml
├── nginx/
│   └── nginx.conf       # From deploy/nginx/nginx.conf
└── web/
    └── out/             # From apps/web/out/ (static export)
        ├── index.html
        ├── 404.html
        ├── _next/
        │   └── static/
        ├── poems/
        └── ...
```

## Useful VPS commands

**View nginx logs:**

```bash
cd /var/www/qafiyah
docker compose logs -f nginx
```

**Restart nginx:**

```bash
docker compose restart nginx
```

**Stop:**

```bash
docker compose down
```

## Contents of this folder

| Path                    | Purpose |
|-------------------------|---------|
| `docker-compose.yml`    | nginx service for VPS (no Postgres). |
| `nginx/nginx.conf`     | Site config: routing, caching, security headers. |

Root `docker-compose.yml` (repo root) is for **local** Postgres only; this `deploy/` setup is for the **VPS** only.

## Troubleshooting

- **404 on routes like `/poems/`:** Ensure `trailingSlash: true` in Next.js and that `try_files $uri $uri/ $uri/index.html =404` is in `nginx.conf` (it is in the default config).
- **Stale content:** HTML is set to no-cache; if you still see old data, do a hard refresh or clear cache. For config changes, run `docker compose up -d --force-recreate` on the VPS.
- **Permission denied on VPS:** Ensure `/var/www/qafiyah` is owned by the user running `docker compose` (see one-time setup).
- **Connection refused to API:** The site calls `api.qafiyah.com` at runtime; check DNS and Cloudflare. Build-time data is fetched from `localhost:8787` during `pnpm build:static` only.
