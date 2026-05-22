#!/usr/bin/env bash
# Local development: seeded Postgres in Docker + hot-reloading API & web servers.
set -euo pipefail

# Bring up (and, on a fresh volume, auto-seed) the database; wait until healthy.
docker compose up -d --wait db

# Ensure the local env files the dev servers read exist.
[[ -f apps/api/.env ]] || cp apps/api/.env.example apps/api/.env
[[ -f apps/web/.env ]] || cp apps/web/.env.example apps/web/.env

# API (:8787, --hot) + web (:4321, astro dev) with hot reload.
exec turbo run dev --filter=@qafiyah/web --filter=@qafiyah/api
