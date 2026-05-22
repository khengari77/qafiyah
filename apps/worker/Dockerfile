# syntax=docker/dockerfile:1
# Build context = repo root (workspace deps need the root lockfile).
# Multi-stage: cache install on manifest changes, prune devDependencies for the
# runtime image, and run as the non-root `bun` user. The worker reads Postgres
# (@qafiyah/db) and syncs to Elasticsearch (@qafiyah/search) on a schedule.

FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: install the full workspace from the frozen lockfile (manifests only).
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/typescript/package.json packages/typescript/package.json
RUN bun install --frozen-lockfile

# --- prod-deps: clean prod-only install, then bring the source the worker runs.
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/typescript/package.json packages/typescript/package.json
# --ignore-scripts: the root `prepare` runs husky (a devDep, absent under
# --production) and would fail the build; worker prod deps need no postinstall.
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY apps/worker ./apps/worker
COPY packages ./packages

# --- runtime: minimal image, non-root, with an HTTP healthcheck.
FROM base AS runtime
ENV WORKER_PORT=8088
RUN apk add --no-cache tini
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/apps/worker ./apps/worker
EXPOSE 8088
USER bun
WORKDIR /app/apps/worker
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8088/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "run", "src/server.ts"]
