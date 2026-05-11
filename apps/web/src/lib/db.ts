import type { DbClient } from '@qafiyah/db';
import { createDb } from '@qafiyah/db';

let cached: DbClient | null = null;

export function getDb(): DbClient {
  if (cached) return cached;
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for build-time queries. ' +
        'Copy apps/web/.env.example to apps/web/.env and set it before running `astro build`.'
    );
  }
  cached = createDb(url);
  return cached;
}
