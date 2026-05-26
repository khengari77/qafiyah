import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type {
  CollectionSlug,
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  RhymeSlug,
  ThemeSlug,
} from '@qafiyah/contracts';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  themeSlugSchema,
} from '@qafiyah/contracts';
import { type SQL, sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asPoemSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { type PoemListRow, rawPoemRowSchema } from './row-schemas';
import { poemsFullData } from './schema';

declare const PoemIdBrand: unique symbol;
export type PoemId = number & { readonly [PoemIdBrand]: 'PoemId' };

export type RandomPoemLines = {
  readonly poemId: PoemId;
  readonly poetName: string;
  readonly content: string;
  readonly slug: PoemSlug;
};

type ParsedPoemContent = {
  readonly verses: readonly (readonly [string, string])[];
  readonly sample: string;
  readonly keywords: string;
};

export function parsePoemContent(content: string): ParsedPoemContent {
  const lines = content.split('*');
  const lineCount = lines.length;

  // @WARN: verses is built mutably for performance, then projected as readonly on return.
  const verses: [string, string][] = new Array(Math.ceil(lineCount / 2));

  for (let i = 0, j = 0; i < lineCount; i += 2, j++) {
    verses[j] = [lines[i] || '', lines[i + 1] || ''];
  }

  const sample = lines.slice(0, 3).join(' * ');
  const keywords = lines.join(' ').split(' ').join(',');

  return {
    verses,
    sample,
    keywords,
  };
}

export type ListAllPoemSlugsError = { readonly kind: 'sql_error'; readonly message: string };

export async function listAllPoemSlugs(
  db: DbClient
): Promise<Result<readonly PoemSlug[], ListAllPoemSlugsError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.select({ slug: poemsFullData.slug }).from(poemsFullData),
    (cause): ListAllPoemSlugsError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(queryResult.value.map((row) => asPoemSlug(row.slug)));
}

const randomPoemPayloadSchema = v.pipe(
  v.object({
    poem_id: v.pipe(
      v.number(),
      v.transform((n): PoemId => n as PoemId)
    ),
    poet_name: v.string(),
    content: v.string(),
    slug: poemSlugSchema,
  }),
  v.transform(
    (payload): RandomPoemLines => ({
      poemId: payload.poem_id,
      poetName: payload.poet_name,
      content: payload.content,
      slug: payload.slug,
    })
  )
);

function safeJsonParse(
  raw: string
): Result<unknown, { kind: 'invalid_json'; raw: string; message: string }> {
  try {
    return ok(JSON.parse(raw));
  } catch (cause) {
    return err({
      kind: 'invalid_json',
      raw,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export type GetRandomPoemError =
  | { readonly kind: 'no_eligible_poem' }
  | { readonly kind: 'invalid_json'; readonly raw: string; readonly message: string }
  | {
      readonly kind: 'invalid_payload_shape';
      readonly raw: unknown;
      readonly issues: readonly string[];
    }
  | { readonly kind: 'missing_content_field'; readonly poemId: PoemId }
  | { readonly kind: 'query_failed'; readonly message: string };

export async function getRandomPoem(
  db: DbClient
): Promise<Result<RandomPoemLines, GetRandomPoemError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.execute(sql`SELECT random_poem_json()`),
    (cause): { kind: 'query_failed'; message: string } => ({
      kind: 'query_failed',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const result = queryResult.value;

  if (!result || result.length === 0 || !result[0]?.['random_poem_json']) {
    return err({ kind: 'no_eligible_poem' });
  }

  const poemJson = result[0]['random_poem_json'];
  let parsed: unknown;
  if (typeof poemJson === 'string') {
    const jsonResult = safeJsonParse(poemJson);
    if (jsonResult.isErr()) return err(jsonResult.error);
    parsed = jsonResult.value;
  } else {
    parsed = poemJson;
  }

  const schemaResult = v.safeParse(randomPoemPayloadSchema, parsed);
  if (!schemaResult.success) {
    return err({
      kind: 'invalid_payload_shape',
      raw: parsed,
      issues: schemaResult.issues.map((i) => i.message),
    });
  }

  const poem: RandomPoemLines = schemaResult.output;
  if (!poem.content) {
    return err({ kind: 'missing_content_field', poemId: poem.poemId });
  }

  return ok(poem);
}

const relatedPoemItemSchema = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  poet_name: v.string(),
  poet_slug: poetSlugSchema,
  meter_name: v.string(),
  meter_slug: meterSlugSchema,
});

const poemDetailRowSchema = v.object({
  slug: poemSlugSchema,
  title: v.nullable(v.string()),
  content: v.nullable(v.string()),
  verse_count: v.number(),
  poet_name: v.nullable(v.string()),
  poet_slug: poetSlugSchema,
  meter_name: v.nullable(v.string()),
  meter_slug: meterSlugSchema,
  theme_name: v.nullable(v.string()),
  theme_slug: v.nullable(themeSlugSchema),
  era_name: v.nullable(v.string()),
  era_slug: eraSlugSchema,
  related_poems: v.array(relatedPoemItemSchema),
});
type PoemDetailRow = v.InferOutput<typeof poemDetailRowSchema>;

export type PoemDetail = {
  readonly metadata: {
    readonly poetName: string;
    readonly poetSlug: PoetSlug;
    readonly eraName: string;
    readonly eraSlug: EraSlug;
    readonly meterName: string;
    readonly meterSlug: MeterSlug;
    readonly themeName: string;
    readonly themeSlug: ThemeSlug;
  };
  readonly displayTitle: string;
  readonly verseCount: number;
  readonly parsedContent: ReturnType<typeof parsePoemContent>;
  readonly relatedPoems: readonly PoemListRow[];
};

export type GetPoemBySlugError =
  | { readonly kind: 'not_found'; readonly slug: PoemSlug }
  | { readonly kind: 'sql_error'; readonly slug: PoemSlug; readonly message: string }
  | {
      readonly kind: 'invalid_payload_shape';
      readonly slug: PoemSlug;
      readonly issues: readonly string[];
    }
  | { readonly kind: 'incomplete_poem_data'; readonly slug: PoemSlug };

function tagExecuteAsError(slug: PoemSlug) {
  return (
    e: ExecuteAsError
  ):
    | { readonly kind: 'sql_error'; readonly slug: PoemSlug; readonly message: string }
    | {
        readonly kind: 'invalid_payload_shape';
        readonly slug: PoemSlug;
        readonly issues: readonly string[];
      } => {
    if (e.kind === 'sql_error') return { kind: 'sql_error', slug, message: e.message };
    return { kind: 'invalid_payload_shape', slug, issues: e.issues };
  };
}

function hasRequiredPoemFields(row: PoemDetailRow): row is PoemDetailRow & {
  title: string;
  content: string;
  poet_name: string;
  meter_name: string;
  era_name: string;
  theme_name: string;
  theme_slug: ThemeSlug;
} {
  return (
    row.title !== null &&
    row.content !== null &&
    row.poet_name !== null &&
    row.meter_name !== null &&
    row.era_name !== null &&
    row.theme_name !== null &&
    row.theme_slug !== null
  );
}

export async function getPoemBySlug(
  db: DbClient,
  slug: PoemSlug
): Promise<Result<PoemDetail, GetPoemBySlugError>> {
  const queryResult = await executeAs(
    db,
    sql`
      SELECT
        p.slug,
        p.title,
        p.content,
        p.verse_count,
        pt.name  AS poet_name,
        pt.slug  AS poet_slug,
        m.name   AS meter_name,
        m.slug   AS meter_slug,
        th.name  AS theme_name,
        th.slug  AS theme_slug,
        e.name   AS era_name,
        e.slug   AS era_slug,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'title',      rp.title,
              'slug',       rp.slug,
              'poet_name',  rpt.name,
              'poet_slug',  rpt.slug,
              'meter_name', rm.name,
              'meter_slug', rm.slug
            ) ORDER BY pr.rank
          ) FILTER (WHERE pr.related_id IS NOT NULL),
          '[]'::jsonb
        ) AS related_poems
      FROM public.poems p
      JOIN  public.poets  pt  ON pt.id = p.poet_id
      JOIN  public.eras   e   ON e.id  = pt.era_id
      JOIN  public.meters m   ON m.id  = p.meter_id
      LEFT JOIN public.themes          th  ON th.id  = p.theme_id
      LEFT JOIN public.poem_relations  pr  ON pr.poem_id = p.id
      LEFT JOIN public.poems           rp  ON rp.id = pr.related_id
      LEFT JOIN public.poets           rpt ON rpt.id = rp.poet_id
      LEFT JOIN public.meters          rm  ON rm.id = rp.meter_id
      WHERE p.slug = ${slug}
      GROUP BY
        p.slug, p.title, p.content, p.verse_count,
        pt.name, pt.slug, m.name, m.slug,
        th.name, th.slug, e.name, e.slug
    `,
    poemDetailRowSchema
  );

  if (queryResult.isErr()) return err(tagExecuteAsError(slug)(queryResult.error));

  const rows = queryResult.value;
  if (rows.length === 0) return err({ kind: 'not_found', slug });

  const row = rows[0];
  if (row === undefined || !hasRequiredPoemFields(row))
    return err({ kind: 'incomplete_poem_data', slug });

  return ok({
    metadata: {
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      eraName: row.era_name,
      eraSlug: row.era_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
      themeName: row.theme_name,
      themeSlug: row.theme_slug,
    },
    displayTitle: row.title,
    verseCount: row.verse_count,
    parsedContent: parsePoemContent(row.content),
    relatedPoems: row.related_poems.map((r) => ({
      title: r.title,
      slug: r.slug,
      poetName: r.poet_name,
      poetSlug: r.poet_slug,
      meterName: r.meter_name,
      meterSlug: r.meter_slug,
    })),
  });
}

export type PoemFilters = {
  readonly poetSlugs?: readonly PoetSlug[];
  readonly eraSlugs?: readonly EraSlug[];
  readonly themeSlugs?: readonly ThemeSlug[];
  readonly meterSlugs?: readonly MeterSlug[];
  readonly rhymeSlugs?: readonly RhymeSlug[];
  readonly collectionSlugs?: readonly CollectionSlug[];
};

export type ListPoemsResult = {
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListPoemsError = ExecuteAsError;

function nonEmpty<T>(arr: readonly T[] | undefined): arr is readonly T[] {
  return arr !== undefined && arr.length > 0;
}

function formatPgTextArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((val) => `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

export async function listPoems(
  db: DbClient,
  filters: PoemFilters,
  page: number
): Promise<Result<ListPoemsResult, ListPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const wantEra = nonEmpty(filters.eraSlugs);
  const wantTheme = nonEmpty(filters.themeSlugs);
  const wantRhyme = nonEmpty(filters.rhymeSlugs);
  const wantCollection = nonEmpty(filters.collectionSlugs);

  const joinParts: SQL[] = [
    sql`JOIN public.poets pt ON p.poet_id = pt.id`,
    sql`JOIN public.meters m ON p.meter_id = m.id`,
  ];
  if (wantEra) joinParts.push(sql`JOIN public.eras e ON pt.era_id = e.id`);
  if (wantTheme) joinParts.push(sql`JOIN public.themes th ON p.theme_id = th.id`);
  if (wantRhyme) joinParts.push(sql`JOIN public.rhymes r ON p.rhyme_id = r.id`);
  if (wantCollection) joinParts.push(sql`JOIN public.collections c ON p.collection_id = c.id`);
  const joinClause = sql.join(joinParts, sql` `);

  const { poetSlugs, eraSlugs, meterSlugs, themeSlugs, rhymeSlugs, collectionSlugs } = filters;
  const wherePieces: SQL[] = [];
  if (nonEmpty(poetSlugs))
    wherePieces.push(sql`pt.slug = ANY(${formatPgTextArrayLiteral(poetSlugs)}::text[])`);
  if (nonEmpty(eraSlugs))
    wherePieces.push(sql`e.slug = ANY(${formatPgTextArrayLiteral(eraSlugs)}::text[])`);
  if (nonEmpty(meterSlugs))
    wherePieces.push(sql`m.slug = ANY(${formatPgTextArrayLiteral(meterSlugs)}::text[])`);
  if (nonEmpty(themeSlugs))
    wherePieces.push(sql`th.slug = ANY(${formatPgTextArrayLiteral(themeSlugs)}::text[])`);
  if (nonEmpty(rhymeSlugs))
    wherePieces.push(sql`r.slug = ANY(${formatPgTextArrayLiteral(rhymeSlugs)}::text[])`);
  if (nonEmpty(collectionSlugs))
    wherePieces.push(sql`c.slug = ANY(${formatPgTextArrayLiteral(collectionSlugs)}::text[])`);

  const whereClause =
    wherePieces.length === 0 ? sql`` : sql`WHERE ${sql.join(wherePieces, sql` AND `)}`;

  const rowsResult = await executeAs(
    db,
    sql`
      SELECT
        p.title       AS title,
        p.slug        AS slug,
        pt.name       AS poet_name,
        pt.slug       AS poet_slug,
        m.name        AS meter_name,
        m.slug        AS meter_slug
      FROM public.poems p
      ${joinClause}
      ${whereClause}
      ORDER BY p.id
      LIMIT ${limit} OFFSET ${offset}
    `,
    rawPoemRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);

  const countResult = await executeAs(
    db,
    sql`
      SELECT COUNT(*)::int AS total
      FROM public.poems p
      ${joinClause}
      ${whereClause}
    `,
    v.object({ total: v.number() })
  );
  if (countResult.isErr()) return err(countResult.error);

  const total = countResult.value[0]?.total ?? 0;
  const poems: readonly PoemListRow[] = rowsResult.value.map((row) => ({
    title: row.title,
    slug: row.slug,
    poetName: row.poet_name,
    poetSlug: row.poet_slug,
    meterName: row.meter_name,
    meterSlug: row.meter_slug,
  }));

  return ok({
    poems,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
