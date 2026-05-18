import { type MatchType, SEARCH_POEMS_PER_PAGE, SEARCH_POETS_PER_PAGE } from '@qafiyah/constants';
import type {
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  RhymeSlug,
  ThemeSlug,
} from '@qafiyah/contracts';
import { eraSlugSchema, meterSlugSchema, poemSlugSchema, poetSlugSchema } from '@qafiyah/contracts';
import { type SQL, sql } from 'drizzle-orm';
import * as v from 'valibot';
import type { DbClient } from './client';
import { executeAs } from './execute-as';

export type { MatchType };

export type SearchFilters = {
  readonly meterSlugs: readonly MeterSlug[] | null;
  readonly eraSlugs: readonly EraSlug[] | null;
  readonly themeSlugs: readonly ThemeSlug[] | null;
  readonly rhymeSlugs: readonly RhymeSlug[] | null;
};

export type PoemsSearchRow = {
  readonly poetName: string;
  readonly poetEra: string;
  readonly poetEraSlug: EraSlug;
  readonly poetSlug: PoetSlug;
  readonly poemTitle: string;
  readonly poemSnippet: string;
  readonly poemMeter: string;
  readonly poemMeterSlug: MeterSlug;
  readonly poemSlug: PoemSlug;
  readonly relevance: number;
};

export type PoetsSearchRow = {
  readonly poetName: string;
  readonly poetEra: string;
  readonly poetEraSlug: EraSlug;
  readonly poetSlug: PoetSlug;
  readonly poetBio: string;
  readonly relevance: number;
};

export type SearchPage<T> = {
  readonly rows: readonly T[];
  readonly totalCount: number;
};

const rawPoemsSearchRowSchema = v.object({
  poet_name: v.string(),
  poet_era: v.string(),
  poet_era_slug: eraSlugSchema,
  poet_slug: poetSlugSchema,
  poem_title: v.string(),
  poem_snippet: v.string(),
  poem_meter: v.string(),
  poem_meter_slug: meterSlugSchema,
  poem_slug: poemSlugSchema,
  relevance: v.number(),
  total_count: v.optional(v.union([v.number(), v.string()])),
});
type RawPoemsSearchRow = v.InferOutput<typeof rawPoemsSearchRowSchema>;

const rawPoetsSearchRowSchema = v.object({
  poet_name: v.string(),
  poet_era: v.string(),
  poet_era_slug: eraSlugSchema,
  poet_slug: poetSlugSchema,
  poet_bio: v.string(),
  relevance: v.number(),
  total_count: v.optional(v.union([v.number(), v.string()])),
});
type RawPoetsSearchRow = v.InferOutput<typeof rawPoetsSearchRowSchema>;

const filterIdsRowSchema = v.object({
  kind: v.picklist(['meter', 'era', 'theme', 'rhyme'] as const),
  id: v.number(),
});

const idRowSchema = v.object({ id: v.number() });

const countRowSchema = v.object({ total: v.union([v.number(), v.string()]) });

function intArrayParam(ids: readonly number[] | null): SQL {
  if (ids === null) return sql`NULL::INTEGER[]`;
  if (ids.length === 0) return sql`'{}'::INTEGER[]`;
  return sql`${`{${ids.join(',')}}`}::INTEGER[]`;
}

function textArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

type FilterIds = {
  readonly meterIds: readonly number[] | null;
  readonly eraIds: readonly number[] | null;
  readonly themeIds: readonly number[] | null;
  readonly rhymeIds: readonly number[] | null;
};

async function lookupFilterIds(
  db: DbClient,
  meterSlugs: readonly MeterSlug[] | null,
  eraSlugs: readonly EraSlug[] | null,
  themeSlugs: readonly ThemeSlug[] | null,
  rhymeSlugs: readonly RhymeSlug[] | null
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

  const rows = await executeAs(
    db,
    sql`
      SELECT 'meter' AS kind, id FROM meter_stats WHERE ${mLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${mLit}::TEXT[]) OR slug::TEXT = ANY(${mLit}::TEXT[]))`}
      UNION ALL
      SELECT 'era' AS kind, id FROM era_stats WHERE ${eLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${eLit}::TEXT[]) OR slug::TEXT = ANY(${eLit}::TEXT[]))`}
      UNION ALL
      SELECT 'theme' AS kind, id FROM theme_stats WHERE ${tLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${tLit}::TEXT[]) OR slug::TEXT = ANY(${tLit}::TEXT[]))`}
      UNION ALL
      SELECT 'rhyme' AS kind, id FROM rhyme_stats WHERE ${rLit === null ? sql`FALSE` : sql`(id::TEXT = ANY(${rLit}::TEXT[]) OR slug::TEXT = ANY(${rLit}::TEXT[]))`}
    `,
    filterIdsRowSchema
  );

  // @WARN: buckets are mutated below to partition rows by kind. They are projected into
  //   readonly arrays before returning.
  const meterBucket: number[] = [];
  const eraBucket: number[] = [];
  const themeBucket: number[] = [];
  const rhymeBucket: number[] = [];
  for (const row of rows) {
    switch (row.kind) {
      case 'meter':
        meterBucket.push(row.id);
        break;
      case 'era':
        eraBucket.push(row.id);
        break;
      case 'theme':
        themeBucket.push(row.id);
        break;
      case 'rhyme':
        rhymeBucket.push(row.id);
        break;
    }
  }
  return {
    meterIds: m ? meterBucket : null,
    eraIds: e ? eraBucket : null,
    themeIds: t ? themeBucket : null,
    rhymeIds: r ? rhymeBucket : null,
  };
}

async function lookupEraIdsOnly(
  db: DbClient,
  slugs: readonly EraSlug[] | null
): Promise<readonly number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const lit = textArrayLiteral(slugs);
  const rows = await executeAs(
    db,
    sql`SELECT id FROM era_stats WHERE id::TEXT = ANY(${lit}::TEXT[]) OR slug::TEXT = ANY(${lit}::TEXT[])`,
    idRowSchema
  );
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

export async function searchPoems(args: {
  readonly db: DbClient;
  readonly query: string;
  readonly page: number;
  readonly matchType: MatchType;
  readonly filters: SearchFilters;
}): Promise<SearchPage<PoemsSearchRow>> {
  const { db, query, page, matchType, filters } = args;
  const { meterIds, eraIds, themeIds, rhymeIds } = await lookupFilterIds(
    db,
    filters.meterSlugs,
    filters.eraSlugs,
    filters.themeSlugs,
    filters.rhymeSlugs
  );

  const raw = await executeAs(
    db,
    sql`
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
    `,
    rawPoemsSearchRowSchema
  );

  if (raw.length === 0) return { rows: [], totalCount: 0 };

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

export async function searchPoets(args: {
  readonly db: DbClient;
  readonly query: string;
  readonly page: number;
  readonly matchType: MatchType;
  readonly eraSlugs: readonly EraSlug[] | null;
}): Promise<SearchPage<PoetsSearchRow>> {
  const { db, query, page, matchType, eraSlugs } = args;
  const eraIds = await lookupEraIdsOnly(db, eraSlugs);

  const raw = await executeAs(
    db,
    sql`
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
    `,
    rawPoetsSearchRowSchema
  );

  if (raw.length === 0) return { rows: [], totalCount: 0 };

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

function readTotalCount(
  rows: readonly v.InferOutput<typeof countRowSchema>[],
  label: string
): number {
  const row = rows[0];
  const raw = row?.total;
  if (raw === undefined || raw === null) throw new Error(`${label}: SQL row missing total`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${label}: total is not finite (got ${String(raw)})`);
  return n;
}

export async function listPoemsByFilters(args: {
  readonly db: DbClient;
  readonly page: number;
  readonly filters: SearchFilters;
}): Promise<SearchPage<PoemsSearchRow>> {
  const { db, page, filters } = args;
  const { meterIds, eraIds, themeIds, rhymeIds } = await lookupFilterIds(
    db,
    filters.meterSlugs,
    filters.eraSlugs,
    filters.themeSlugs,
    filters.rhymeSlugs
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

  const rowsPromise = executeAs(
    db,
    sql`
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
    `,
    rawPoemsSearchRowSchema
  );

  const countPromise = executeAs(
    db,
    sql`
      SELECT COUNT(*)::bigint AS total
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      WHERE ${filterClause}
    `,
    countRowSchema
  );

  const [rows, count] = await Promise.all([rowsPromise, countPromise]);

  return {
    rows: rows.map(mapPoemRow),
    totalCount: readTotalCount(count, 'listPoemsByFilters'),
  };
}

export async function listPoetsByFilters(args: {
  readonly db: DbClient;
  readonly page: number;
  readonly eraSlugs: readonly EraSlug[] | null;
}): Promise<SearchPage<PoetsSearchRow>> {
  const { db, page, eraSlugs } = args;
  const eraIds = await lookupEraIdsOnly(db, eraSlugs);
  const eraParam = intArrayParam(eraIds);
  const offset = (page - 1) * SEARCH_POETS_PER_PAGE;

  const filterClause = sql`(${eraParam} IS NULL OR pt.era_id = ANY(${eraParam}))`;

  const rowsPromise = executeAs(
    db,
    sql`
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
    `,
    rawPoetsSearchRowSchema
  );

  const countPromise = executeAs(
    db,
    sql`
      SELECT COUNT(*)::bigint AS total
      FROM public.poets pt
      WHERE ${filterClause}
    `,
    countRowSchema
  );

  const [rows, count] = await Promise.all([rowsPromise, countPromise]);

  return {
    rows: rows.map(mapPoetRow),
    totalCount: readTotalCount(count, 'listPoetsByFilters'),
  };
}
