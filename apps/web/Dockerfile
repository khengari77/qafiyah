# syntax=docker/dockerfile:1
# Build context = repo root. Multi-stage: cache install on manifest changes,
# build Astro with full deps, then assemble a pruned, fully non-root serve image
# (nginx front + Bun SSR origin), both running as the unprivileged `nginx` user.

FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# --- deps: cache-friendly full install (manifests only -> install).
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/typescript/package.json packages/typescript/package.json
COPY packages/search/package.json packages/search/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN bun install --frozen-lockfile

# --- build: astro build (NO DB, NO snapshot). Needs devDependencies + esbuild's
# postinstall, so this stage keeps lifecycle scripts (no --ignore-scripts).
FROM deps AS build
COPY . .
RUN bun run --filter @qafiyah/web build

# --- prod-deps: clean prod-only install + the package source the SSR imports.
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/constants/package.json packages/constants/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/typescript/package.json packages/typescript/package.json
COPY packages/search/package.json packages/search/package.json
COPY apps/worker/package.json apps/worker/package.json
# --ignore-scripts: the root `prepare` (husky, a devDep) fails under
# --production. Only the runtime install uses it — the `deps`/`build` stage
# must keep scripts so esbuild's postinstall runs for `astro build`.
# --linker hoisted: the repo's isolated linker leaves transitive deps unhoisted,
# but the bundled SSR server resolves externalized deps (e.g. @orpc/contract,
# via the bundled @qafiyah/contracts) from a flat root node_modules. Hoisting the
# runtime install makes them resolvable; the host's install config is untouched.
RUN bun install --frozen-lockfile --production --ignore-scripts --linker hoisted
COPY packages ./packages

# --- serve: nginx (front) + Bun standalone SSR (origin), fully non-root.
FROM oven/bun:1.3.14-alpine AS serve
RUN apk add --no-cache nginx tini
WORKDIR /app
# Keep dist at its workspace path so the standalone server resolves externalized
# modules from the flat (hoisted) root node_modules; packages/ provides the
# @qafiyah/* workspace symlink targets for any source consumed at runtime.
COPY --from=build     /app/apps/web/dist  ./apps/web/dist
COPY --from=prod-deps /app/node_modules   ./node_modules
COPY --from=prod-deps /app/packages       ./packages
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/nginx-security-headers.conf /etc/nginx/nginx-security-headers.conf
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
# nginx writes its cache as the unprivileged `nginx` user; pid + temp -> /tmp.
RUN chmod +x /docker-entrypoint.sh \
    && mkdir -p /var/cache/nginx/astro \
    && chown -R nginx:nginx /var/cache/nginx
# SSR_PORT (not PORT) for the Bun origin: the entrypoint maps it to PORT for
# Astro, so a stray compose `PORT` can't accidentally repoint the SSR origin.
ENV HOST=127.0.0.1 SSR_PORT=4321
EXPOSE 8080
USER nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
