import { DOUBLE_QUOTE_REGEX } from '@qafiyah/constants';
import type { EraSlug, MeterSlug, PoemSlug, PoetSlug, ThemeSlug } from '@qafiyah/contracts';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  themeSlugSchema,
} from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asPoemSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import type { PoemListRow } from './row-schemas';
import { poemsFullData } from './schema';

declare const PoemIdBrand: unique symbol;
export type PoemId = number & { readonly [PoemIdBrand]: 'PoemId' };

export type RandomPoemLines = {
  readonly poemId: PoemId;
  readonly poetName: string;
  readonly content: string;
};

type ParsedPoemContent = {
  readonly verses: readonly (readonly [string, string])[];
  readonly sample: string;
  readonly keywords: string;
};

export function parsePoemContent(content: string): ParsedPoemContent {
  const cleanContent = content.replace(DOUBLE_QUOTE_REGEX, '');

  const lines = cleanContent.split('*');
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
  }),
  v.transform(
    (payload): RandomPoemLines => ({
      poemId: payload.poem_id,
      poetName: payload.poet_name,
      content: payload.content,
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
    db.execute(sql`SELECT get_random_eligible_poem()`),
    (cause): { kind: 'query_failed'; message: string } => ({
      kind: 'query_failed',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const result = queryResult.value;

  if (!result || result.length === 0 || !result[0]?.['get_random_eligible_poem']) {
    return err({ kind: 'no_eligible_poem' });
  }

  const poemJson = result[0]['get_random_eligible_poem'];
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

export type GetRandomPoemSlugError =
  | { readonly kind: 'no_eligible_poem_slug' }
  | { readonly kind: 'invalid_payload_shape'; readonly raw: unknown }
  | { readonly kind: 'query_failed'; readonly message: string };

export async function getRandomPoemSlug(
  db: DbClient
): Promise<Result<PoemSlug, GetRandomPoemSlugError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.execute(sql`SELECT get_random_eligible_poem_slug()`),
    (cause): { kind: 'query_failed'; message: string } => ({
      kind: 'query_failed',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const result = queryResult.value;
  const row = result?.[0];

  if (!row?.['get_random_eligible_poem_slug']) {
    return err({ kind: 'no_eligible_poem_slug' });
  }

  const value = row['get_random_eligible_poem_slug'];
  if (
    typeof value !== 'object' ||
    value === null ||
    !('slug' in value) ||
    typeof value.slug !== 'string'
  ) {
    return err({ kind: 'invalid_payload_shape', raw: value });
  }

  return ok(asPoemSlug(value.slug));
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
    displayTitle: row.title.replace(DOUBLE_QUOTE_REGEX, ''),
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
