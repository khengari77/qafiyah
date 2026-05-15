import { SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import { type SQL, sql } from 'drizzle-orm';
import type { DbClient } from '../client';

export type PoemsSearchRow = {
  poetName: string;
  poetEra: string;
  poetEraSlug: string;
  poetSlug: string;
  poemTitle: string;
  poemSnippet: string;
  poemMeter: string;
  poemMeterSlug: string;
  poemSlug: string;
  relevance: number;
};

export type PoetsSearchRow = {
  poetName: string;
  poetEra: string;
  poetEraSlug: string;
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
  poet_era_slug: string;
  poet_slug: string;
  poem_title: string;
  poem_snippet: string;
  poem_meter: string;
  poem_meter_slug: string;
  poem_slug: string;
  relevance: number;
  total_count: number | string;
};

type RawPoetsSearchRow = {
  poet_name: string;
  poet_era: string;
  poet_era_slug: string;
  poet_slug: string;
  poet_bio: string;
  relevance: number;
  total_count: number | string;
};

function intArrayParam(ids: number[] | null): SQL {
  if (ids === null) return sql`NULL::INTEGER[]`;
  if (ids.length === 0) return sql`'{}'::INTEGER[]`;
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

  if (!(m || e || t || r)) {
    return { meterIds: null, eraIds: null, themeIds: null, rhymeIds: null };
  }

  const mLit = m ? textArrayLiteral(m) : null;
  const eLit = e ? textArrayLiteral(e) : null;
  const tLit = t ? textArrayLiteral(t) : null;
  const rLit = r ? textArrayLiteral(r) : null;

  const rows = (await db.execute(sql`
    SELECT 'meter' AS kind, id FROM meter_stats WHERE ${mLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${mLit}::TEXT[]) OR slug::TEXT = ANY(${mLit}::TEXT[]))`}
    UNION ALL
    SELECT 'era' AS kind, id FROM era_stats WHERE ${eLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${eLit}::TEXT[]) OR slug::TEXT = ANY(${eLit}::TEXT[]))`}
    UNION ALL
    SELECT 'theme' AS kind, id FROM theme_stats WHERE ${tLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${tLit}::TEXT[]) OR slug::TEXT = ANY(${tLit}::TEXT[]))`}
    UNION ALL
    SELECT 'rhyme' AS kind, id FROM rhyme_stats WHERE ${rLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${rLit}::TEXT[]) OR slug::TEXT = ANY(${rLit}::TEXT[]))`}
  `)) as unknown as { kind: 'meter' | 'era' | 'theme' | 'rhyme'; id: number }[];

  const meterBucket: number[] = [];
  const eraBucket: number[] = [];
  const themeBucket: number[] = [];
  const rhymeBucket: number[] = [];
  const buckets: Record<'meter' | 'era' | 'theme' | 'rhyme', number[]> = {
    meter: meterBucket,
    era: eraBucket,
    theme: themeBucket,
    rhyme: rhymeBucket,
  };
  for (const row of rows) (buckets as Record<string, number[] | undefined>)[row.kind]?.push(row.id);
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
    sql`SELECT id FROM era_stats WHERE id::TEXT = ANY(${lit}::TEXT[]) OR slug::TEXT = ANY(${lit}::TEXT[])`
  )) as unknown as { id: number }[];
  return rows.map((r) => r.id);
}

function mapPoemRow(r: Omit<RawPoemsSearchRow, 'total_count'>): PoemsSearchRow {
  return {
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetEraSlug: r.poet_era_slug,
    poetSlug: r.poet_slug,
    poemTitle: r.poem_title,
    poemSnippet: r.poem_snippet,
    poemMeter: r.poem_meter,
    poemMeterSlug: r.poem_meter_slug,
    poemSlug: r.poem_slug,
    relevance: r.relevance,
  };
}

function mapPoetRow(r: Omit<RawPoetsSearchRow, 'total_count'>): PoetsSearchRow {
  return {
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetEraSlug: r.poet_era_slug,
    poetSlug: r.poet_slug,
    poetBio: r.poet_bio,
    relevance: r.relevance,
  };
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

  const raw = (await db.execute(sql`
    WITH s AS (
      SELECT * FROM search_poems(
        ${query}::TEXT,
        ${page}::INTEGER,
        ${matchType}::TEXT,
        ${intArrayParam(meterIds)},
        ${intArrayParam(eraIds)},
        ${intArrayParam(themeIds)},
        ${intArrayParam(rhymeIds)}
      )
    )
    SELECT
      s.*,
      m.slug AS poem_meter_slug,
      e.slug AS poet_era_slug
    FROM s
    LEFT JOIN public.meters m ON m.name = s.poem_meter
    LEFT JOIN public.eras e ON e.name = s.poet_era
  `)) as unknown as RawPoemsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const rawTotal = raw[0]?.total_count;
  if (rawTotal === undefined || rawTotal === null) {
    throw new Error('searchPoems: SQL row missing total_count');
  }
  const totalCount = Number(rawTotal);
  if (!Number.isFinite(totalCount)) {
    throw new Error(`searchPoems: total_count is not a finite number (got ${String(rawTotal)})`);
  }
  return { rows: raw.map(mapPoemRow), totalCount };
}

export async function searchPoets(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  eraSlugs: string[] | null
): Promise<SearchPage<PoetsSearchRow>> {
  const eraIds = await lookupEraIdsOnly(db, eraSlugs);

  const raw = (await db.execute(sql`
    WITH s AS (
      SELECT * FROM search_poets(
        ${query}::TEXT,
        ${page}::INTEGER,
        ${matchType}::TEXT,
        ${intArrayParam(eraIds)}
      )
    )
    SELECT
      s.*,
      e.slug AS poet_era_slug
    FROM s
    LEFT JOIN public.eras e ON e.name = s.poet_era
  `)) as unknown as RawPoetsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const rawTotal = raw[0]?.total_count;
  if (rawTotal === undefined || rawTotal === null) {
    throw new Error('searchPoets: SQL row missing total_count');
  }
  const totalCount = Number(rawTotal);
  if (!Number.isFinite(totalCount)) {
    throw new Error(`searchPoets: total_count is not a finite number (got ${String(rawTotal)})`);
  }
  return { rows: raw.map(mapPoetRow), totalCount };
}

type CountRow = { total: number | string };

function readTotalCount(rows: unknown, label: string): number {
  const row = (rows as CountRow[] | undefined)?.[0];
  const raw = row?.total;
  if (raw === undefined || raw === null) throw new Error(`${label}: SQL row missing total`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${label}: total is not finite (got ${String(raw)})`);
  return n;
}

export async function listPoemsByFilters(
  db: DbClient,
  page: number,
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

  const meterParam = intArrayParam(meterIds);
  const eraParam = intArrayParam(eraIds);
  const themeParam = intArrayParam(themeIds);
  const rhymeParam = intArrayParam(rhymeIds);

  const offset = (page - 1) * SEARCH_POEMS_PER_PAGE;

  const filterClause = sql`
    (${meterParam} IS NULL OR p.meter_id = ANY(${meterParam}))
    AND (${eraParam} IS NULL OR pt.era_id = ANY(${eraParam}))
    AND (${themeParam} IS NULL OR p.theme_id = ANY(${themeParam}))
    AND (${rhymeParam} IS NULL OR p.rhyme_id = ANY(${rhymeParam}))
  `;

  const rowsPromise = db.execute(sql`
    SELECT
      pt.name AS poet_name,
      e.name AS poet_era,
      e.slug AS poet_era_slug,
      pt.slug AS poet_slug,
      p.title AS poem_title,
      array_to_string((string_to_array(p.content, '*'))[1:2], '*') AS poem_snippet,
      m.name AS poem_meter,
      m.slug AS poem_meter_slug,
      p.slug AS poem_slug,
      0::real AS relevance
    FROM public.poems p
    JOIN public.poets pt ON p.poet_id = pt.id
    JOIN public.meters m ON p.meter_id = m.id
    JOIN public.eras e ON pt.era_id = e.id
    WHERE ${filterClause}
    ORDER BY p.id DESC
    LIMIT ${SEARCH_POEMS_PER_PAGE}
    OFFSET ${offset}
  `);

  const countPromise = db.execute(sql`
    SELECT COUNT(*)::bigint AS total
    FROM public.poems p
    JOIN public.poets pt ON p.poet_id = pt.id
    WHERE ${filterClause}
  `);

  const [rawRows, rawCount] = await Promise.all([rowsPromise, countPromise]);

  const typedRows = rawRows as unknown as Omit<RawPoemsSearchRow, 'total_count'>[];

  return {
    rows: typedRows.map(mapPoemRow),
    totalCount: readTotalCount(rawCount, 'listPoemsByFilters'),
  };
}

export async function listPoetsByFilters(
  db: DbClient,
  page: number,
  eraSlugs: string[] | null
): Promise<SearchPage<PoetsSearchRow>> {
  const eraIds = await lookupEraIdsOnly(db, eraSlugs);
  const eraParam = intArrayParam(eraIds);
  const offset = (page - 1) * SEARCH_POETS_PER_PAGE;

  const filterClause = sql`(${eraParam} IS NULL OR pt.era_id = ANY(${eraParam}))`;

  const rowsPromise = db.execute(sql`
    SELECT
      pt.name AS poet_name,
      e.name AS poet_era,
      e.slug AS poet_era_slug,
      pt.slug AS poet_slug,
      COALESCE(pt.bio, '') AS poet_bio,
      0::double precision AS relevance
    FROM public.poets pt
    JOIN public.eras e ON pt.era_id = e.id
    WHERE ${filterClause}
    ORDER BY pt.id DESC
    LIMIT ${SEARCH_POETS_PER_PAGE}
    OFFSET ${offset}
  `);

  const countPromise = db.execute(sql`
    SELECT COUNT(*)::bigint AS total
    FROM public.poets pt
    WHERE ${filterClause}
  `);

  const [rawRows, rawCount] = await Promise.all([rowsPromise, countPromise]);

  const typedRows = rawRows as unknown as Omit<RawPoetsSearchRow, 'total_count'>[];

  return {
    rows: typedRows.map(mapPoetRow),
    totalCount: readTotalCount(rawCount, 'listPoetsByFilters'),
  };
}
