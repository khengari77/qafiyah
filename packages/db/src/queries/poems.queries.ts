import { MAX_EXCERPT_LENGTH } from '@qafiyah/constants';
import type { EraSlug, MeterSlug, PoemSlug, PoetSlug, ThemeSlug } from '@qafiyah/contracts';
import {
  eraSlugSchema,
  meterSlugSchema,
  poemSlugSchema,
  poetSlugSchema,
  themeSlugSchema,
} from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import * as v from 'valibot';
import type { DbClient } from '../client';
import { poemsFullData } from '../schema';
import { asMeterSlug, asPoemSlug, asPoetSlug } from '../utils/brand';
import { executeAs } from '../utils/execute-as';
import {
  extractPoemExcerpt,
  type PoemId,
  type RandomPoemLines,
} from '../utils/extract-poem-excerpt';
import { processPoemContent } from '../utils/process-poem-content';

const rawPoemDataSchema = v.object({
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
export type RawPoemData = v.InferOutput<typeof rawPoemDataSchema>;

const rawRelatedPoemSchema = v.object({
  poem_slug: poemSlugSchema,
  poet_name: v.string(),
  meter_name: v.string(),
  poem_title: v.string(),
});
export type RawRelatedPoem = v.InferOutput<typeof rawRelatedPoemSchema>;

// SQL function payload variants. The function returns either { poem, related_poems }
// on success or { error, message? } on failure. We normalize into a discriminated
// union with `kind` at parse time.
const poemWithRelatedPayloadSchema = v.union([
  v.pipe(
    v.object({
      poem: rawPoemDataSchema,
      related_poems: v.array(rawRelatedPoemSchema),
    }),
    v.transform((payload) => ({ kind: 'ok' as const, ...payload }))
  ),
  v.pipe(
    v.object({
      error: v.string(),
      message: v.optional(v.string()),
    }),
    v.transform((payload) => ({ kind: 'error' as const, ...payload }))
  ),
]);
export type PoemWithRelatedResponse = v.InferOutput<typeof poemWithRelatedPayloadSchema>;

export async function listAllPoemSlugs(db: DbClient): Promise<readonly PoemSlug[]> {
  const rows = await db.select({ slug: poemsFullData.slug }).from(poemsFullData);
  return rows.map((r) => asPoemSlug(r.slug));
}

const randomPoemPayloadSchema = v.object({
  poem_id: v.pipe(
    v.number(),
    v.transform((n): PoemId => n as PoemId)
  ),
  poet_name: v.string(),
  content: v.string(),
});

function pickExcerptStartIndex(content: string): number {
  const lineCount = content.split('*').length;
  const maxStartIndex = Math.max(0, lineCount - 2);
  return Math.floor(Math.random() * (maxStartIndex / 2)) * 2;
}

export async function getRandomPoemLines(db: DbClient): Promise<string> {
  const result = await db.execute(sql`SELECT get_random_eligible_poem()`);

  if (!result || result.length === 0 || !result[0]?.['get_random_eligible_poem']) {
    throw new Error('getRandomPoemLines: SQL returned no eligible poem');
  }

  const poemJson = result[0]['get_random_eligible_poem'];
  const parsed: unknown = typeof poemJson === 'string' ? JSON.parse(poemJson) : poemJson;
  const poem: RandomPoemLines = v.parse(randomPoemPayloadSchema, parsed);

  if (!poem.content) {
    throw new Error('getRandomPoemLines: poem missing content field');
  }

  const content = extractPoemExcerpt(poem, pickExcerptStartIndex(poem.content));

  if (content.length > MAX_EXCERPT_LENGTH) {
    throw new Error(
      `getRandomPoemLines: excerpt length ${content.length} exceeds MAX_EXCERPT_LENGTH ${MAX_EXCERPT_LENGTH}`
    );
  }

  return content;
}

export async function getRandomPoemSlug(db: DbClient): Promise<PoemSlug> {
  const result = await db.execute(sql`SELECT get_random_eligible_poem_slug()`);
  const row = result?.[0];

  if (!row?.['get_random_eligible_poem_slug']) {
    throw new Error('getRandomPoemSlug: SQL returned no eligible poem slug');
  }

  const value = row['get_random_eligible_poem_slug'];
  if (
    typeof value !== 'object' ||
    value === null ||
    !('slug' in value) ||
    typeof value.slug !== 'string'
  ) {
    throw new Error('getRandomPoemSlug: unexpected SQL payload shape');
  }

  return asPoemSlug(value.slug);
}

export type RelatedPoem = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poetName: string;
  readonly poetSlug: PoetSlug;
  readonly meterName: string;
  readonly meterSlug: MeterSlug;
};

export type PoemResourceData = {
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
  readonly clearTitle: string;
  readonly processedContent: ReturnType<typeof processPoemContent>;
  readonly relatedPoems: readonly RelatedPoem[];
};

type GetPoemResult =
  | { readonly type: 'found'; readonly data: PoemResourceData }
  | { readonly type: 'not_found' }
  | { readonly type: 'error'; readonly message: string };

const meterLookupRowSchema = v.object({ slug: meterSlugSchema });
const themeLookupRowSchema = v.object({ slug: themeSlugSchema });
const relatedEnrichmentRowSchema = v.object({
  poem_slug: poemSlugSchema,
  poet_slug: poetSlugSchema,
  meter_slug: meterSlugSchema,
});

function textArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

type RelatedEnrichmentRow = v.InferOutput<typeof relatedEnrichmentRowSchema>;
type Enrichment = {
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
] as const satisfies readonly (keyof RawPoemData)[];

function hasRequiredFields(poem: RawPoemData): boolean {
  return REQUIRED_POEM_FIELDS.every((k) => Boolean(poem[k]));
}

async function loadPoemPayload(
  db: DbClient,
  slug: PoemSlug
): Promise<PoemWithRelatedResponse | null> {
  const result = await db.execute(sql`SELECT get_poem_with_related(${slug})`);
  if (!result || result.length === 0 || !result[0]?.['get_poem_with_related']) return null;
  return v.parse(poemWithRelatedPayloadSchema, result[0]['get_poem_with_related']);
}

async function loadEnrichment(
  db: DbClient,
  poem: RawPoemData,
  relatedSlugs: readonly PoemSlug[]
): Promise<Enrichment | null> {
  const [meterLookup, themeLookup, relatedEnrichment] = await Promise.all([
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
      ? Promise.resolve([] as readonly RelatedEnrichmentRow[])
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
            WHERE p.slug::TEXT = ANY(${textArrayLiteral(relatedSlugs)}::TEXT[])
          `,
          relatedEnrichmentRowSchema
        ),
  ]);

  const meterSlug = meterLookup[0]?.slug;
  const themeSlug = themeLookup[0]?.slug;
  if (!(meterSlug && themeSlug)) return null;

  return {
    meterSlug,
    themeSlug,
    enrichmentMap: new Map(relatedEnrichment.map((r) => [r.poem_slug, r])),
  };
}

function buildResource(
  poem: RawPoemData,
  related_poems: readonly RawRelatedPoem[],
  enrichment: Enrichment
): PoemResourceData {
  const { meterSlug, themeSlug, enrichmentMap } = enrichment;
  const relatedPoems: readonly RelatedPoem[] = related_poems.map((r) => {
    const enriched = enrichmentMap.get(r.poem_slug);
    return {
      title: r.poem_title,
      slug: r.poem_slug,
      poetName: r.poet_name,
      poetSlug: enriched?.poet_slug ?? asPoetSlug(''),
      meterName: r.meter_name,
      meterSlug: enriched?.meter_slug ?? asMeterSlug(''),
    };
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
    clearTitle: poem.title.replace(/"/g, ''),
    processedContent: processPoemContent(poem.content),
    relatedPoems,
  };
}

export async function getPoemBySlug(db: DbClient, slug: PoemSlug): Promise<GetPoemResult> {
  const payload = await loadPoemPayload(db, slug);
  if (!payload) return { type: 'not_found' };
  if (payload.kind === 'error') {
    return { type: 'error', message: payload.message || payload.error };
  }
  const { poem, related_poems } = payload;
  if (!hasRequiredFields(poem)) {
    return { type: 'error', message: 'Incomplete poem data' };
  }
  const relatedSlugs = related_poems.map((r) => r.poem_slug);
  const enrichment = await loadEnrichment(db, poem, relatedSlugs);
  if (!enrichment) {
    return { type: 'error', message: 'Incomplete poem data' };
  }
  return { type: 'found', data: buildResource(poem, related_poems, enrichment) };
}
