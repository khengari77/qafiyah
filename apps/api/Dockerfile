# syntax=docker/dockerfile:1
# Build context = repo root (workspace deps need the root lockfile).
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
