#!/bin/sh
set -e
# Start the Astro standalone SSR server (origin), then nginx (front).
HOST="${HOST:-127.0.0.1}" PORT="${PORT:-4321}" bun /app/apps/web/dist/server/entry.mjs &
exec nginx -g 'daemon off;'
