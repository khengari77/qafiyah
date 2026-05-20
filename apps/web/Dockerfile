# syntax=docker/dockerfile:1
# Build context = repo root.

# --- Build stage: snapshot DB → JSON, then astro build ---
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# generate-snapshot.ts reads the DB over the network at build time.
# Pass a reachable Postgres URL: e.g. the running db container's published
# host port, or the production DB. docker compose build does NOT join the
# compose network, so this must be independently reachable.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN cd apps/web && bun run build

# --- Serve stage: nginx serving the static dist ---
FROM nginx:1.27-alpine AS serve
# Reuse the checked-in config (www→apex, trailing-slash, /_astro/ immutable, UTF-8).
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# nginx.conf declares `root /var/www/qafiyah;`
COPY --from=build /app/apps/web/dist /var/www/qafiyah
EXPOSE 80
