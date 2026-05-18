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
import { err, ok, type Result } from 'neverthrow';
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

export type PoemSearchRow = {
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

export type PoetSearchRow = {
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

export type SearchTotalError =
  | {
      readonly kind: 'missing_total';
      readonly source: string;
      readonly inputs: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'non_finite_total';
      readonly source: string;
      readonly raw: unknown;
      readonly inputs: Readonly<Record<string, unknown>>;
    };

const rawPoemSearchRowSchema = v.object({
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
type RawPoemSearchRow = v.InferOutput<typeof rawPoemSearchRowSchema>;

const rawPoetSearchRowSchema = v.object({
  poet_name: v.string(),
  poet_era: v.string(),
  poet_era_slug: eraSlugSchema,
  poet_slug: poetSlugSchema,
  poet_bio: v.string(),
  relevance: v.number(),
  total_count: v.optional(v.union([v.number(), v.string()])),
});
type RawPoetSearchRow = v.InferOutput<typeof rawPoetSearchRowSchema>;

const filterIdsRowSchema = v.object({
  kind: v.picklist(['meter', 'era', 'theme', 'rhyme'] as const),
  id: v.number(),
});

const idRowSchema = v.object({ id: v.number() });

const countRowSchema = v.object({ total: v.union([v.number(), v.string()]) });

function toPgIntArrayParam(ids: readonly number[] | null): SQL {
  if (ids === null) return sql`NULL::INTEGER[]`;
  if (ids.length === 0) return sql`'{}'::INTEGER[]`;
  return sql`${`{${ids.join(',')}}`}::INTEGER[]`;
}

function formatPgTextArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
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
  const meterFilter = meterSlugs && meterSlugs.length > 0 ? meterSlugs : null;
  const eraFilter = eraSlugs && eraSlugs.length > 0 ? eraSlugs : null;
  const themeFilter = themeSlugs && themeSlugs.length > 0 ? themeSlugs : null;
  const rhymeFilter = rhymeSlugs && rhymeSlugs.length > 0 ? rhymeSlugs : null;

  if (!(meterFilter || eraFilter || themeFilter || rhymeFilter)) {
    return { meterIds: null, eraIds: null, themeIds: null, rhymeIds: null };
  }

  const meterLiteral = meterFilter ? formatPgTextArrayLiteral(meterFilter) : null;
  const eraLiteral = eraFilter ? formatPgTextArrayLiteral(eraFilter) : null;
  const themeLiteral = themeFilter ? formatPgTextArrayLiteral(themeFilter) : null;
  const rhymeLiteral = rhymeFilter ? formatPgTextArrayLiteral(rhymeFilter) : null;

  const rows = await executeAs(
    db,
    sql`
      SELECT 'meter' AS kind, id FROM meter_stats WHERE ${meterLiteral === null ? sql`FALSE` : sql`(id::TEXT = ANY(${meterLiteral}::TEXT[]) OR slug::TEXT = ANY(${meterLiteral}::TEXT[]))`}
      UNION ALL
      SELECT 'era' AS kind, id FROM era_stats WHERE ${eraLiteral === null ? sql`FALSE` : sql`(id::TEXT = ANY(${eraLiteral}::TEXT[]) OR slug::TEXT = ANY(${eraLiteral}::TEXT[]))`}
      UNION ALL
      SELECT 'theme' AS kind, id FROM theme_stats WHERE ${themeLiteral === null ? sql`FALSE` : sql`(id::TEXT = ANY(${themeLiteral}::TEXT[]) OR slug::TEXT = ANY(${themeLiteral}::TEXT[]))`}
      UNION ALL
      SELECT 'rhyme' AS kind, id FROM rhyme_stats WHERE ${rhymeLiteral === null ? sql`FALSE` : sql`(id::TEXT = ANY(${rhymeLiteral}::TEXT[]) OR slug::TEXT = ANY(${rhymeLiteral}::TEXT[]))`}
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
    meterIds: meterFilter ? meterBucket : null,
    eraIds: eraFilter ? eraBucket : null,
    themeIds: themeFilter ? themeBucket : null,
    rhymeIds: rhymeFilter ? rhymeBucket : null,
  };
}

async function lookupEraIds(
  db: DbClient,
  slugs: readonly EraSlug[] | null
): Promise<readonly number[] | null> {
  if (!slugs || slugs.length === 0) return null;
  const literal = formatPgTextArrayLiteral(slugs);
  const rows = await executeAs(
    db,
    sql`SELECT id FROM era_stats WHERE id::TEXT = ANY(${literal}::TEXT[]) OR slug::TEXT = ANY(${literal}::TEXT[])`,
    idRowSchema
  );
  return rows.map((row) => row.id);
}

function toPoemSearchRow(row: Omit<RawPoemSearchRow, 'total_count'>): PoemSearchRow {
  return {
    poetName: row.poet_name,
    poetEra: row.poet_era,
    poetEraSlug: row.poet_era_slug,
    poetSlug: row.poet_slug,
    poemTitle: row.poem_title,
    poemSnippet: row.poem_snippet,
    poemMeter: row.poem_meter,
    poemMeterSlug: row.poem_meter_slug,
    poemSlug: row.poem_slug,
    relevance: row.relevance,
  };
}

function toPoetSearchRow(row: Omit<RawPoetSearchRow, 'total_count'>): PoetSearchRow {
  return {
    poetName: row.poet_name,
    poetEra: row.poet_era,
    poetEraSlug: row.poet_era_slug,
    poetSlug: row.poet_slug,
    poetBio: row.poet_bio,
    relevance: row.relevance,
  };
}

export async function searchPoems(args: {
  readonly db: DbClient;
  readonly query: string;
  readonly page: number;
  readonly matchType: MatchType;
  readonly filters: SearchFilters;
}): Promise<Result<SearchPage<PoemSearchRow>, SearchTotalError>> {
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
          ${toPgIntArrayParam(meterIds)},
          ${toPgIntArrayParam(eraIds)},
          ${toPgIntArrayParam(themeIds)},
          ${toPgIntArrayParam(rhymeIds)}
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
    rawPoemSearchRowSchema
  );

  if (raw.length === 0) return ok({ rows: [], totalCount: 0 });

  const inputs = { query, page, matchType, filters } as const;
  const totalResult = parseRawTotalCount(raw[0]?.total_count, 'searchPoems', inputs);
  if (totalResult.isErr()) return err(totalResult.error);
  return ok({ rows: raw.map(toPoemSearchRow), totalCount: totalResult.value });
}

export async function searchPoets(args: {
  readonly db: DbClient;
  readonly query: string;
  readonly page: number;
  readonly matchType: MatchType;
  readonly eraSlugs: readonly EraSlug[] | null;
}): Promise<Result<SearchPage<PoetSearchRow>, SearchTotalError>> {
  const { db, query, page, matchType, eraSlugs } = args;
  const eraIds = await lookupEraIds(db, eraSlugs);

  const raw = await executeAs(
    db,
    sql`
      WITH s AS (
        SELECT * FROM search_poets(
          ${query}::TEXT,
          ${page}::INTEGER,
          ${matchType}::TEXT,
          ${toPgIntArrayParam(eraIds)}
        )
      )
      SELECT
        s.*,
        e.slug AS poet_era_slug
      FROM s
      LEFT JOIN public.eras e ON e.name = s.poet_era
    `,
    rawPoetSearchRowSchema
  );

  if (raw.length === 0) return ok({ rows: [], totalCount: 0 });

  const inputs = { query, page, matchType, eraSlugs } as const;
  const totalResult = parseRawTotalCount(raw[0]?.total_count, 'searchPoets', inputs);
  if (totalResult.isErr()) return err(totalResult.error);
  return ok({ rows: raw.map(toPoetSearchRow), totalCount: totalResult.value });
}

function parseRawTotalCount(
  raw: unknown,
  source: string,
  inputs: Readonly<Record<string, unknown>>
): Result<number, SearchTotalError> {
  if (raw === undefined || raw === null) {
    return err({ kind: 'missing_total', source, inputs });
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return err({ kind: 'non_finite_total', source, raw, inputs });
  }
  return ok(parsed);
}

function parseTotalCountRow(
  rows: readonly v.InferOutput<typeof countRowSchema>[],
  source: string,
  inputs: Readonly<Record<string, unknown>>
): Result<number, SearchTotalError> {
  return parseRawTotalCount(rows[0]?.total, source, inputs);
}

export async function browsePoemsByFilters(args: {
  readonly db: DbClient;
  readonly page: number;
  readonly filters: SearchFilters;
}): Promise<Result<SearchPage<PoemSearchRow>, SearchTotalError>> {
  const { db, page, filters } = args;
  const { meterIds, eraIds, themeIds, rhymeIds } = await lookupFilterIds(
    db,
    filters.meterSlugs,
    filters.eraSlugs,
    filters.themeSlugs,
    filters.rhymeSlugs
  );

  const meterParam = toPgIntArrayParam(meterIds);
  const eraParam = toPgIntArrayParam(eraIds);
  const themeParam = toPgIntArrayParam(themeIds);
  const rhymeParam = toPgIntArrayParam(rhymeIds);

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
    rawPoemSearchRowSchema
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

  const inputs = { page, filters } as const;
  const totalResult = parseTotalCountRow(count, 'browsePoemsByFilters', inputs);
  if (totalResult.isErr()) return err(totalResult.error);
  return ok({ rows: rows.map(toPoemSearchRow), totalCount: totalResult.value });
}

export async function browsePoetsByFilters(args: {
  readonly db: DbClient;
  readonly page: number;
  readonly eraSlugs: readonly EraSlug[] | null;
}): Promise<Result<SearchPage<PoetSearchRow>, SearchTotalError>> {
  const { db, page, eraSlugs } = args;
  const eraIds = await lookupEraIds(db, eraSlugs);
  const eraParam = toPgIntArrayParam(eraIds);
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
    rawPoetSearchRowSchema
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

  const inputs = { page, eraSlugs } as const;
  const totalResult = parseTotalCountRow(count, 'browsePoetsByFilters', inputs);
  if (totalResult.isErr()) return err(totalResult.error);
  return ok({ rows: rows.map(toPoetSearchRow), totalCount: totalResult.value });
}
