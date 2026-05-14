import { type SQL, sql } from 'drizzle-orm';
import type { DbClient } from '../client';

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

function textArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

type FilterIds = {
  meterIds: number[] | null;
  eraIds: number[] | null;
  themeIds: number[] | null;
  rhymeIds: number[] | null;
};

async function lookupFilterIds(
  db: DbClient,
  meterSlugs: string[] | null,
  eraSlugs: string[] | null,
  themeSlugs: string[] | null,
  rhymeSlugs: string[] | null
): Promise<FilterIds> {
  const m = meterSlugs && meterSlugs.length > 0 ? meterSlugs : null;
  const e = eraSlugs && eraSlugs.length > 0 ? eraSlugs : null;
  const t = themeSlugs && themeSlugs.length > 0 ? themeSlugs : null;
  const r = rhymeSlugs && rhymeSlugs.length > 0 ? rhymeSlugs : null;

  if (!m && !e && !t && !r) {
    return { meterIds: null, eraIds: null, themeIds: null, rhymeIds: null };
  }

  const mLit = m ? textArrayLiteral(m) : null;
  const eLit = e ? textArrayLiteral(e) : null;
  const tLit = t ? textArrayLiteral(t) : null;
  const rLit = r ? textArrayLiteral(r) : null;

  const rows = (await db.execute(sql`
    SELECT 'meter' AS kind, id FROM meter_stats WHERE ${mLit !== null ? sql`slug = ANY(${mLit}::TEXT[])` : sql`FALSE`}
    UNION ALL
    SELECT 'era' AS kind, id FROM era_stats WHERE ${eLit !== null ? sql`slug = ANY(${eLit}::TEXT[])` : sql`FALSE`}
    UNION ALL
    SELECT 'theme' AS kind, id FROM theme_stats WHERE ${tLit !== null ? sql`slug = ANY(${tLit}::TEXT[])` : sql`FALSE`}
    UNION ALL
    SELECT 'rhyme' AS kind, id FROM rhyme_stats WHERE ${rLit !== null ? sql`slug = ANY(${rLit}::TEXT[])` : sql`FALSE`}
  `)) as unknown as { kind: string; id: number }[];

  const meterBucket: number[] = [];
  const eraBucket: number[] = [];
  const themeBucket: number[] = [];
  const rhymeBucket: number[] = [];
  for (const row of rows) {
    if (row.kind === 'meter') meterBucket.push(row.id);
    else if (row.kind === 'era') eraBucket.push(row.id);
    else if (row.kind === 'theme') themeBucket.push(row.id);
    else if (row.kind === 'rhyme') rhymeBucket.push(row.id);
  }
  return {
    meterIds: m ? meterBucket : null,
    eraIds: e ? eraBucket : null,
    themeIds: t ? themeBucket : null,
    rhymeIds: r ? rhymeBucket : null,
  };
}

async function lookupEraIdsOnly(db: DbClient, slugs: string[] | null): Promise<number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const lit = textArrayLiteral(slugs);
  const rows = (await db.execute(
    sql`SELECT id FROM era_stats WHERE slug = ANY(${lit}::TEXT[])`
  )) as unknown as { id: number }[];
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
  const { meterIds, eraIds, themeIds, rhymeIds } = await lookupFilterIds(
    db,
    meterSlugs,
    eraSlugs,
    themeSlugs,
    rhymeSlugs
  );

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
  const eraIds = await lookupEraIdsOnly(db, eraSlugs);

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
