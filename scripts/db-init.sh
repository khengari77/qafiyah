#!/usr/bin/env bash
# Postgres first-boot init hook (mounted into /docker-entrypoint-initdb.d/).
# Runs ONCE, only when the data volume is empty, after $POSTGRES_DB is created.
# Restores the newest dump from /dumps so `docker compose up` yields a seeded DB.
# On an existing volume this never runs — use `bun run db:reset` to refresh.
set -euo pipefail

dump="$(find /dumps -name '*.dump' -type f | sort -r | head -1)"
if [[ -z "${dump}" ]]; then
  echo "[db-init] no .dump found in /dumps — starting with an empty database" >&2
  exit 0
fi

echo "[db-init] restoring ${dump} into ${POSTGRES_DB}..."
# The dump recreates the public schema; drop the default one Postgres created.
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  -c 'DROP SCHEMA IF EXISTS public CASCADE;'
pg_restore --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  --format=custom --no-owner --no-acl "${dump}"
echo "[db-init] restore complete"
