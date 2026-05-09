import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { MAX_URLS_PER_SITEMAP } from '../constants';
import { eraStats, meterStats, poemsFullData, poetStats, rhymeStats, themeStats } from '../schema';

export async function getPoemCount(db: DbClient): Promise<number> {
  const [{ count } = { count: 0 }] = await db.select({ count: sql`count(*)` }).from(poemsFullData);
  return Number(count);
}

export async function listSitemapPoems(db: DbClient, page: number) {
  const offset = (page - 1) * MAX_URLS_PER_SITEMAP;
  return db
    .select({ slug: poemsFullData.slug })
    .from(poemsFullData)
    .limit(MAX_URLS_PER_SITEMAP)
    .offset(offset);
}

export async function listPoetSitemapData(db: DbClient) {
  const [{ count } = { count: 0 }] = await db.select({ count: sql`count(*)` }).from(poetStats);
  const poets = await db.select().from(poetStats);
  return { count: Number(count), poets };
}

export async function listEraStats(db: DbClient) {
  return db.select().from(eraStats);
}

export async function listMeterStats(db: DbClient) {
  return db.select().from(meterStats);
}

export async function listRhymeStats(db: DbClient) {
  return db.select().from(rhymeStats);
}

export async function listThemeStats(db: DbClient) {
  return db.select().from(themeStats);
}
