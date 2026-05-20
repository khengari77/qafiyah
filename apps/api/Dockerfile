# syntax=docker/dockerfile:1
# Build context = repo root (workspace deps need the root lockfile).
# @NOTE: single-stage on purpose (YAGNI for a single self-hosted server). It
# ships the whole monorepo + devDeps (~large image). If image size becomes a
# concern, split into install→prod-prune stages copying only apps/api + the
# packages/* it needs. Runs as the image's default user (root); nginx/Bun are
# behind a reverse proxy on the VPS, so non-root hardening is deferred.
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

# Install all workspace deps from the frozen lockfile.
COPY . .
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

WORKDIR /app/apps/api
CMD ["bun", "run", "src/server.ts"]
