#!/bin/sh
# Web container entrypoint: run the Astro standalone SSR origin (Bun) and nginx
# as sibling children under tini (PID 1). If EITHER dies, exit so the container
# stops and `restart: unless-stopped` recovers the whole thing — a crashed SSR
# origin must not leave nginx up serving 502s behind a still-"healthy" container.
HOST="${HOST:-127.0.0.1}" PORT="${PORT:-4321}" bun /app/apps/web/dist/server/entry.mjs &
ssr=$!
nginx -g 'daemon off;' &
ngx=$!

# Forward stop signals to both children for a graceful `docker stop`.
trap 'kill -TERM "$ssr" "$ngx" 2>/dev/null' TERM INT

# POSIX sh has no `wait -n`, so poll: loop while BOTH are alive. tini reaps them.
while kill -0 "$ssr" 2>/dev/null && kill -0 "$ngx" 2>/dev/null; do
  sleep 5
done

kill "$ssr" "$ngx" 2>/dev/null
exit 1
