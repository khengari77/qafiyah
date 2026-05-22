#!/usr/bin/env bash
# One-shot full Postgres -> Elasticsearch reindex against the running stack.
# Builds a fresh versioned index per entity, bulk-loads it, then swaps the alias
# (zero-downtime). Use for initial population and full rebuilds.
set -euo pipefail

docker compose run --rm worker bun run src/reindex.ts
