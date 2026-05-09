import type { DbClient } from '@qafiyah/db';
import { createDb } from '@qafiyah/db';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required at build time');
}

export const db: DbClient = createDb(DATABASE_URL);
