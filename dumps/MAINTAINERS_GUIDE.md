# Database Dump

Creates a clean dump of the `public` schema only.

```bash
pg_dump \
  -h 1.1.1.1 \
  -p 5432 \
  -U qafiyah \
  -d qafiyah \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  -Fc \
  -f qafiyah_public_$(date +%Y%m%d_%H%M%S).dump
````

See [Restore Documentation](./README.md) for restore instructions.
