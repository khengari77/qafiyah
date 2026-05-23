import { DOUBLE_QUOTE_REGEX, MAX_TWEET_LENGTH } from '@qafiyah/constants';
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
import { match } from 'ts-pattern';
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
  readonly verseCount: number;
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

  const verseCount = verses.length;

  const sample = lines.slice(0, 3).join(' * ');
  const keywords = lines.join(' ').split(' ').join(',');

  return {
    verses,
    verseCount,
    sample,
    keywords,
  };
}

export type ExtractExcerptError = {
  readonly kind: 'insufficient_content';
  readonly poemId: PoemId;
  readonly lineCount: number;
};

export function extractPoemExcerpt(
  poem: RandomPoemLines,
  startIndex: number
): Result<string, ExtractExcerptError> {
  const lines = poem.content.split('*');
  if (lines.length < 2) {
    return err({ kind: 'insufficient_content', poemId: poem.poemId, lineCount: lines.length });
  }
  const line1 = lines[startIndex] || '';
  const line2 = lines[startIndex + 1] || '';
  return ok(`${line1}\n${line2}\n\n${poem.poetName}`.replace(DOUBLE_QUOTE_REGEX, '').trim());
}

const rawPoemRowSchema = v.object({
  slug: poemSlugSchema,
  title: v.string(),
  content: v.string(),
  poet_name: v.string(),
  poet_slug: poetSlugSchema,
  meter_name: v.string(),
  theme_name: v.string(),
  era_name: v.string(),
  era_slug: eraSlugSchema,
});
export type RawPoemRow = v.InferOutput<typeof rawPoemRowSchema>;

const rawRelatedPoemRowSchema = v.object({
  poem_slug: poemSlugSchema,
  poet_name: v.string(),
  meter_name: v.string(),
  poem_title: v.string(),
});
export type RawRelatedPoemRow = v.InferOutput<typeof rawRelatedPoemRowSchema>;

// SQL function payload variants. The function returns either { poem, related_poems }
// on success or { error, message? } on failure.
const poemRelatedSuccessSchema = v.object({
  poem: rawPoemRowSchema,
  related_poems: v.array(rawRelatedPoemRowSchema),
});
const poemRelatedSqlErrorSchema = v.object({
  error: v.string(),
  message: v.optional(v.string()),
});
type PoemRelatedSuccess = v.InferOutput<typeof poemRelatedSuccessSchema>;

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

function pickExcerptStartIndex(content: string): number {
  const lineCount = content.split('*').length;
  const maxStartIndex = Math.max(0, lineCount - 2);
  return Math.floor(Math.random() * (maxStartIndex / 2)) * 2;
}

export type RandomPoemExcerpt = {
  readonly lines: readonly [string, string];
  readonly poetName: string;
  readonly excerpt: string;
};

export type GetRandomPoemExcerptError =
  | { readonly kind: 'no_eligible_poem' }
  | { readonly kind: 'invalid_json'; readonly raw: string; readonly message: string }
  | {
      readonly kind: 'invalid_payload_shape';
      readonly raw: unknown;
      readonly issues: readonly string[];
    }
  | { readonly kind: 'missing_content_field'; readonly poemId: PoemId }
  | { readonly kind: 'query_failed'; readonly message: string }
  | ExtractExcerptError
  | {
      readonly kind: 'excerpt_too_long';
      readonly poemId: PoemId;
      readonly length: number;
      readonly max: number;
    };

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

export async function getRandomPoemExcerpt(
  db: DbClient
): Promise<Result<RandomPoemExcerpt, GetRandomPoemExcerptError>> {
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

  const startIndex = pickExcerptStartIndex(poem.content);
  const allLines = poem.content.split('*');
  const line1 = allLines[startIndex] || '';
  const line2 = allLines[startIndex + 1] || '';
  const excerptResult = extractPoemExcerpt(poem, startIndex);
  if (excerptResult.isErr()) return err(excerptResult.error);
  const excerpt = excerptResult.value;

  if (excerpt.length > MAX_TWEET_LENGTH) {
    return err({
      kind: 'excerpt_too_long',
      poemId: poem.poemId,
      length: excerpt.length,
      max: MAX_TWEET_LENGTH,
    });
  }

  return ok({
    lines: [line1, line2] as const,
    poetName: poem.poetName,
    excerpt,
  });
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
  | { readonly kind: 'incomplete_poem_data'; readonly slug: PoemSlug }
  | { readonly kind: 'incomplete_enrichment'; readonly slug: PoemSlug };

const meterLookupRowSchema = v.object({ slug: meterSlugSchema });
const themeLookupRowSchema = v.object({ slug: themeSlugSchema });
const relatedEnrichmentRowSchema = v.object({
  poem_slug: poemSlugSchema,
  poet_slug: poetSlugSchema,
  meter_slug: meterSlugSchema,
});

function formatPgTextArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

type RelatedEnrichmentRow = v.InferOutput<typeof relatedEnrichmentRowSchema>;
type PoemSlugEnrichment = {
  readonly meterSlug: MeterSlug;
  readonly themeSlug: ThemeSlug;
  readonly enrichmentMap: ReadonlyMap<PoemSlug, RelatedEnrichmentRow>;
};

const REQUIRED_POEM_FIELDS = [
  'title',
  'content',
  'poet_name',
  'poet_slug',
  'meter_name',
  'theme_name',
  'era_name',
  'era_slug',
] as const satisfies readonly (keyof RawPoemRow)[];

function hasRequiredFields(poem: RawPoemRow): boolean {
  return REQUIRED_POEM_FIELDS.every((field) => Boolean(poem[field]));
}

type LoadPoemWithRelatedError =
  | { readonly kind: 'not_found'; readonly slug: PoemSlug }
  | { readonly kind: 'sql_error'; readonly slug: PoemSlug; readonly message: string }
  | {
      readonly kind: 'invalid_payload_shape';
      readonly slug: PoemSlug;
      readonly issues: readonly string[];
    };

async function loadPoemWithRelated(
  db: DbClient,
  slug: PoemSlug
): Promise<Result<PoemRelatedSuccess, LoadPoemWithRelatedError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.execute(sql`SELECT get_poem_with_related(${slug})`),
    (cause): LoadPoemWithRelatedError => ({
      kind: 'sql_error',
      slug,
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const result = queryResult.value;
  if (!result || result.length === 0 || !result[0]?.['get_poem_with_related']) {
    return err({ kind: 'not_found', slug });
  }
  const payload = result[0]['get_poem_with_related'];
  const success = v.safeParse(poemRelatedSuccessSchema, payload);
  if (success.success) return ok(success.output);
  const sqlError = v.safeParse(poemRelatedSqlErrorSchema, payload);
  if (sqlError.success) {
    // get_poem_with_related signals a non-resolvable slug via these error codes
    // (a missing poem, or a malformed UUID) — both mean "no such poem" → not_found
    // (so the API returns 404, not 500). Any other error payload is unexpected → sql_error.
    if (sqlError.output.error === 'Not Found' || sqlError.output.error === 'Invalid UUID format') {
      return err({ kind: 'not_found', slug });
    }
    return err({
      kind: 'sql_error',
      slug,
      message: sqlError.output.message ?? sqlError.output.error,
    });
  }
  return err({
    kind: 'invalid_payload_shape',
    slug,
    issues: success.issues.map((i) => i.message),
  });
}

type LoadPoemSlugEnrichmentError =
  | {
      readonly kind: 'incomplete_enrichment';
      readonly meterFound: boolean;
      readonly themeFound: boolean;
    }
  | { readonly kind: 'sql_error'; readonly slug: PoemSlug; readonly message: string }
  | {
      readonly kind: 'invalid_payload_shape';
      readonly slug: PoemSlug;
      readonly issues: readonly string[];
    };

function tagExecuteAsError(slug: PoemSlug) {
  return (
    e: ExecuteAsError
  ):
    | { readonly kind: 'sql_error'; readonly slug: PoemSlug; readonly message: string }
    | {
        readonly kind: 'invalid_payload_shape';
        readonly slug: PoemSlug;
        readonly issues: readonly string[];
      } =>
    match(e)
      .with({ kind: 'sql_error' }, ({ message }) => ({ kind: 'sql_error' as const, slug, message }))
      .with({ kind: 'invalid_payload_shape' }, ({ issues }) => ({
        kind: 'invalid_payload_shape' as const,
        slug,
        issues,
      }))
      .exhaustive();
}

async function loadPoemSlugEnrichment(
  db: DbClient,
  slug: PoemSlug,
  poem: RawPoemRow,
  relatedSlugs: readonly PoemSlug[]
): Promise<Result<PoemSlugEnrichment, LoadPoemSlugEnrichmentError>> {
  const tag = tagExecuteAsError(slug);
  const [meterLookupResult, themeLookupResult, relatedEnrichmentResult] = await Promise.all([
    executeAs(
      db,
      sql`SELECT slug FROM public.meters WHERE name = ${poem.meter_name} LIMIT 1`,
      meterLookupRowSchema
    ),
    executeAs(
      db,
      sql`SELECT slug FROM public.themes WHERE name = ${poem.theme_name} LIMIT 1`,
      themeLookupRowSchema
    ),
    relatedSlugs.length === 0
      ? Promise.resolve(ok([]) as Result<readonly RelatedEnrichmentRow[], ExecuteAsError>)
      : executeAs(
          db,
          sql`
            SELECT
              p.slug::TEXT AS poem_slug,
              pt.slug AS poet_slug,
              m.slug AS meter_slug
            FROM public.poems p
            JOIN public.poets pt ON p.poet_id = pt.id
            JOIN public.meters m ON p.meter_id = m.id
            WHERE p.slug::TEXT = ANY(${formatPgTextArrayLiteral(relatedSlugs)}::TEXT[])
          `,
          relatedEnrichmentRowSchema
        ),
  ]);

  if (meterLookupResult.isErr()) return err(tag(meterLookupResult.error));
  if (themeLookupResult.isErr()) return err(tag(themeLookupResult.error));
  if (relatedEnrichmentResult.isErr()) return err(tag(relatedEnrichmentResult.error));

  const meterLookup = meterLookupResult.value;
  const themeLookup = themeLookupResult.value;
  const relatedEnrichment = relatedEnrichmentResult.value;

  const meterSlug = meterLookup[0]?.slug;
  const themeSlug = themeLookup[0]?.slug;
  if (!(meterSlug && themeSlug)) {
    return err({
      kind: 'incomplete_enrichment',
      meterFound: Boolean(meterSlug),
      themeFound: Boolean(themeSlug),
    });
  }

  return ok({
    meterSlug,
    themeSlug,
    enrichmentMap: new Map(relatedEnrichment.map((row) => [row.poem_slug, row])),
  });
}

function buildPoemResource(
  poem: RawPoemRow,
  related_poems: readonly RawRelatedPoemRow[],
  enrichment: PoemSlugEnrichment
): PoemDetail {
  const { meterSlug, themeSlug, enrichmentMap } = enrichment;
  const relatedPoems: readonly PoemListRow[] = related_poems.flatMap((row) => {
    const enriched = enrichmentMap.get(row.poem_slug);
    if (!enriched) return [];
    return [
      {
        title: row.poem_title,
        slug: row.poem_slug,
        poetName: row.poet_name,
        poetSlug: enriched.poet_slug,
        meterName: row.meter_name,
        meterSlug: enriched.meter_slug,
      },
    ];
  });
  return {
    metadata: {
      poetName: poem.poet_name,
      poetSlug: poem.poet_slug,
      eraName: poem.era_name,
      eraSlug: poem.era_slug,
      meterName: poem.meter_name,
      meterSlug,
      themeName: poem.theme_name,
      themeSlug,
    },
    displayTitle: poem.title.replace(DOUBLE_QUOTE_REGEX, ''),
    parsedContent: parsePoemContent(poem.content),
    relatedPoems,
  };
}

export async function getPoemBySlug(
  db: DbClient,
  slug: PoemSlug
): Promise<Result<PoemDetail, GetPoemBySlugError>> {
  const payloadResult = await loadPoemWithRelated(db, slug);
  if (payloadResult.isErr()) return err(payloadResult.error);
  const { poem, related_poems } = payloadResult.value;
  if (!hasRequiredFields(poem)) {
    return err({ kind: 'incomplete_poem_data', slug });
  }
  const relatedSlugs = related_poems.map((row) => row.poem_slug);
  const enrichmentResult = await loadPoemSlugEnrichment(db, slug, poem, relatedSlugs);
  if (enrichmentResult.isErr()) {
    return err(
      match(enrichmentResult.error)
        .with({ kind: 'incomplete_enrichment' }, () => ({
          kind: 'incomplete_enrichment' as const,
          slug,
        }))
        .with({ kind: 'sql_error' }, ({ message }) => ({
          kind: 'sql_error' as const,
          slug,
          message,
        }))
        .with({ kind: 'invalid_payload_shape' }, ({ issues }) => ({
          kind: 'invalid_payload_shape' as const,
          slug,
          issues,
        }))
        .exhaustive()
    );
  }
  return ok(buildPoemResource(poem, related_poems, enrichmentResult.value));
}
