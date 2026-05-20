# syntax=docker/dockerfile:1
# Build context = repo root.

# --- Build stage: astro build (NO DB, NO snapshot) ---
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN cd apps/web && bun run build

# --- Serve stage: Bun SSR server + nginx ---
FROM oven/bun:1.3.14-alpine AS serve
RUN apk add --no-cache nginx tini && mkdir -p /var/cache/nginx/astro
WORKDIR /app
# Keep dist at its workspace path so the standalone server resolves modules from
# apps/web/node_modules (workspace-local deps, e.g. clsx) then the hoisted root
# node_modules; packages/ provides the @qafiyah/* workspace symlink targets.
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/packages ./packages
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV HOST=127.0.0.1 PORT=4321
EXPOSE 80
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
