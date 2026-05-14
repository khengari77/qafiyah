# Database Dumps

PostgreSQL custom-format (`pg_dump -Fc`) snapshots of the `public` schema.
Newer subdirectories supersede older ones — the highest-numbered directory is
the current dump.

## Requirements

- PostgreSQL ≥ 17 (the dumps target format version 1.16)
- `pg_restore`

## Restore (local development)

If you're working in this repo, prefer the one-liner — it spins up Postgres in
Docker, restores the newest dump, and writes the env files:

```bash
pnpm db:setup
```

## Restore (manual / external use)

Replace the path below with the newest `*.dump` in this directory:

```bash
dropdb --if-exists qafiyah && createdb qafiyah && \
pg_restore \
  -U qafiyah \
  -d qafiyah \
  --no-owner \
  --no-privileges \
  ./0003_29_01_2026/qafiyah_public_20260129_170552.dump
```

## Verify

```bash
psql -U qafiyah -d qafiyah -c "\dt"
psql -U qafiyah -d qafiyah -c "SELECT count(*) FROM poems;"
```
