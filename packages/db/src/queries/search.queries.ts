import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';

export async function searchPoems(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  meterIds: string | null,
  eraIds: string | null,
  themeIds: string | null,
  rhymeIds: string | null
) {
  const results = await db.execute(
    sql`SELECT * FROM search_poems(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${meterIds ? sql`${meterIds}::INTEGER[]` : sql`NULL::INTEGER[]`},
      ${eraIds ? sql`${eraIds}::INTEGER[]` : sql`NULL::INTEGER[]`},
      ${themeIds ? sql`${themeIds}::INTEGER[]` : sql`NULL::INTEGER[]`},
      ${rhymeIds ? sql`${rhymeIds}::INTEGER[]` : sql`NULL::INTEGER[]`}
    )`
  );

  return results || [];
}

export async function searchPoets(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  eraIds: string | null
) {
  const results = await db.execute(
    sql`SELECT * FROM search_poets(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${eraIds ? sql`${eraIds}::INTEGER[]` : sql`NULL::INTEGER[]`}
    )`
  );

  return results || [];
}
