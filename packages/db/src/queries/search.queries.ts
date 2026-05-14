import { inArray, type SQL, sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { eraStats, meterStats, rhymeStats, themeStats } from '../schema';

export type PoemsSearchRow = {
  poetName: string;
  poetEra: string;
  poetSlug: string;
  poemTitle: string;
  poemSnippet: string;
  poemMeter: string;
  poemSlug: string;
  relevance: number;
};

export type PoetsSearchRow = {
  poetName: string;
  poetEra: string;
  poetSlug: string;
  poetBio: string;
  relevance: number;
};

export type SearchPage<T> = {
  rows: T[];
  totalCount: number;
};

type RawPoemsSearchRow = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poem_title: string;
  poem_snippet: string;
  poem_meter: string;
  poem_slug: string;
  relevance: number;
  total_count: number | string;
};

type RawPoetsSearchRow = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poet_bio: string;
  relevance: number;
  total_count: number | string;
};

function intArrayParam(ids: number[] | null): SQL {
  if (!ids || ids.length === 0) return sql`NULL::INTEGER[]`;
  return sql`${`{${ids.join(',')}}`}::INTEGER[]`;
}

async function lookupMeterIds(db: DbClient, slugs: string[] | null): Promise<number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const rows = await db
    .select({ id: meterStats.id })
    .from(meterStats)
    .where(inArray(meterStats.slug, slugs));
  return rows.map((r) => r.id);
}

async function lookupEraIds(db: DbClient, slugs: string[] | null): Promise<number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const rows = await db
    .select({ id: eraStats.id })
    .from(eraStats)
    .where(inArray(eraStats.slug, slugs));
  return rows.map((r) => r.id);
}

async function lookupThemeIds(db: DbClient, slugs: string[] | null): Promise<number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const rows = await db
    .select({ id: themeStats.id })
    .from(themeStats)
    .where(inArray(themeStats.slug, slugs));
  return rows.map((r) => r.id);
}

async function lookupRhymeIds(db: DbClient, slugs: string[] | null): Promise<number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const rows = await db
    .select({ id: rhymeStats.id })
    .from(rhymeStats)
    .where(inArray(rhymeStats.slug, slugs));
  return rows.map((r) => r.id);
}

export async function searchPoems(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  meterSlugs: string[] | null,
  eraSlugs: string[] | null,
  themeSlugs: string[] | null,
  rhymeSlugs: string[] | null
): Promise<SearchPage<PoemsSearchRow>> {
  const [meterIds, eraIds, themeIds, rhymeIds] = await Promise.all([
    lookupMeterIds(db, meterSlugs),
    lookupEraIds(db, eraSlugs),
    lookupThemeIds(db, themeSlugs),
    lookupRhymeIds(db, rhymeSlugs),
  ]);

  const raw = (await db.execute(
    sql`SELECT * FROM search_poems(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${intArrayParam(meterIds)},
      ${intArrayParam(eraIds)},
      ${intArrayParam(themeIds)},
      ${intArrayParam(rhymeIds)}
    )`
  )) as unknown as RawPoemsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const totalCount = Number(raw[0]?.total_count ?? 0);
  const rows: PoemsSearchRow[] = raw.map((r) => ({
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetSlug: r.poet_slug,
    poemTitle: r.poem_title,
    poemSnippet: r.poem_snippet,
    poemMeter: r.poem_meter,
    poemSlug: r.poem_slug,
    relevance: r.relevance,
  }));
  return { rows, totalCount };
}

export async function searchPoets(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  eraSlugs: string[] | null
): Promise<SearchPage<PoetsSearchRow>> {
  const eraIds = await lookupEraIds(db, eraSlugs);

  const raw = (await db.execute(
    sql`SELECT * FROM search_poets(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${intArrayParam(eraIds)}
    )`
  )) as unknown as RawPoetsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const totalCount = Number(raw[0]?.total_count ?? 0);
  const rows: PoetsSearchRow[] = raw.map((r) => ({
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetSlug: r.poet_slug,
    poetBio: r.poet_bio,
    relevance: r.relevance,
  }));
  return { rows, totalCount };
}
