# syntax=docker/dockerfile:1
# Build context = repo root (workspace deps need the root lockfile).
# Multi-stage: cache the install on manifest changes only, prune devDependencies
# for the runtime image, and run as the non-root `bun` user (uid 1000).
# @NOTE: the prod install is monorepo-wide, so the runtime node_modules also
# carries the *prod* deps of apps/web + apps/bot. Bun has no stable per-package
# prod-install yet; dropping all devDependencies + unrelated source is the win.

FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: install the full workspace from the frozen lockfile.
# Copy ONLY manifests first so this layer is cached until a package.json or the
# lockfile changes (source edits no longer bust the install).
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/typescript/package.json packages/typescript/package.json
RUN bun install --frozen-lockfile

# --- prod-deps: clean prod-only install, then bring the source the API runs.
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/typescript/package.json packages/typescript/package.json
# --ignore-scripts: the root `prepare` runs husky (a devDep, absent under
# --production) and would fail the build; API prod deps need no postinstall.
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY apps/api ./apps/api
COPY packages ./packages

# --- runtime: minimal image, non-root, with a DB-free healthcheck.
FROM base AS runtime
ENV PORT=8787
# node_modules (root hoist + @qafiyah/* symlinks), workspace source, and the
# per-app node_modules all come from the pruned stage. apps/api carries src +
# tsconfig.json (needed for the @/* path alias) but no tests (.dockerignore).
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/apps/api ./apps/api
EXPOSE 8787
USER bun
WORKDIR /app/apps/api
# /v1/docs is the OpenAPI reference UI: a 200 that never touches the DB.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8787/v1/docs || exit 1
CMD ["bun", "run", "src/server.ts"]
