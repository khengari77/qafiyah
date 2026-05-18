import { MAX_TWEET_LENGTH } from '@qafiyah/constants';
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
import { asPoemSlug } from './brand';
import type { DbClient } from './client';
import { TASHKEEL_REGEX } from './constants';
import { executeAs } from './execute-as';
import type { PoemListRow } from './row-schemas';
import { poemsFullData } from './schema';

const DOUBLE_QUOTE_REGEX = /"/g;

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

export function removeTashkeel(text: string): string {
  return text.replace(TASHKEEL_REGEX, '');
}

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

  const firstThreeLines = lines.slice(0, 3).join(' * ');
  const sample = removeTashkeel(firstThreeLines);

  const allText = lines.join(' ');
  const keywords = removeTashkeel(allText.split(' ').join(','));

  return {
    verses,
    verseCount,
    sample,
    keywords,
  };
}

export function extractPoemExcerpt(poem: RandomPoemLines, startIndex: number): string {
  const lines = poem.content.split('*');
  if (lines.length < 2) {
    throw new Error('Poem has insufficient content for formatting');
  }
  const line1 = lines[startIndex] || '';
  const line2 = lines[startIndex + 1] || '';
  return `${line1}\n${line2}\n\n${poem.poetName}`.replace(DOUBLE_QUOTE_REGEX, '').trim();
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
// on success or { error, message? } on failure. We normalize into a discriminated
// union with `kind` at parse time.
const poemWithRelatedPayloadSchema = v.union([
  v.pipe(
    v.object({
      poem: rawPoemRowSchema,
      related_poems: v.array(rawRelatedPoemRowSchema),
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
export type PoemWithRelatedPayload = v.InferOutput<typeof poemWithRelatedPayloadSchema>;

export async function listAllPoemSlugs(db: DbClient): Promise<readonly PoemSlug[]> {
  const rows = await db.select({ slug: poemsFullData.slug }).from(poemsFullData);
  return rows.map((row) => asPoemSlug(row.slug));
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

export async function getRandomPoemExcerpt(db: DbClient): Promise<RandomPoemExcerpt> {
  const result = await db.execute(sql`SELECT get_random_eligible_poem()`);

  if (!result || result.length === 0 || !result[0]?.['get_random_eligible_poem']) {
    throw new Error('getRandomPoemExcerpt: SQL returned no eligible poem');
  }

  const poemJson = result[0]['get_random_eligible_poem'];
  const parsed: unknown = typeof poemJson === 'string' ? JSON.parse(poemJson) : poemJson;
  const poem: RandomPoemLines = v.parse(randomPoemPayloadSchema, parsed);

  if (!poem.content) {
    throw new Error('getRandomPoemExcerpt: poem missing content field');
  }

  const startIndex = pickExcerptStartIndex(poem.content);
  const allLines = poem.content.split('*');
  const line1 = allLines[startIndex] || '';
  const line2 = allLines[startIndex + 1] || '';
  const excerpt = extractPoemExcerpt(poem, startIndex);

  if (excerpt.length > MAX_TWEET_LENGTH) {
    throw new Error(
      `getRandomPoemExcerpt: excerpt length ${excerpt.length} exceeds MAX_TWEET_LENGTH ${MAX_TWEET_LENGTH}`
    );
  }

  return {
    lines: [line1, line2] as const,
    poetName: poem.poetName,
    excerpt,
  };
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

export type GetPoemBySlugResult =
  | { readonly kind: 'found'; readonly data: PoemDetail }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'error'; readonly message: string };

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

async function loadPoemWithRelated(
  db: DbClient,
  slug: PoemSlug
): Promise<PoemWithRelatedPayload | null> {
  const result = await db.execute(sql`SELECT get_poem_with_related(${slug})`);
  if (!result || result.length === 0 || !result[0]?.['get_poem_with_related']) return null;
  return v.parse(poemWithRelatedPayloadSchema, result[0]['get_poem_with_related']);
}

async function loadPoemSlugEnrichment(
  db: DbClient,
  poem: RawPoemRow,
  relatedSlugs: readonly PoemSlug[]
): Promise<PoemSlugEnrichment | null> {
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
            WHERE p.slug::TEXT = ANY(${formatPgTextArrayLiteral(relatedSlugs)}::TEXT[])
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
    enrichmentMap: new Map(relatedEnrichment.map((row) => [row.poem_slug, row])),
  };
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

export async function getPoemBySlug(db: DbClient, slug: PoemSlug): Promise<GetPoemBySlugResult> {
  const payload = await loadPoemWithRelated(db, slug);
  if (!payload) return { kind: 'not_found' };
  if (payload.kind === 'error') {
    return { kind: 'error', message: payload.message || payload.error };
  }
  const { poem, related_poems } = payload;
  if (!hasRequiredFields(poem)) {
    return { kind: 'error', message: 'Incomplete poem data' };
  }
  const relatedSlugs = related_poems.map((row) => row.poem_slug);
  const enrichment = await loadPoemSlugEnrichment(db, poem, relatedSlugs);
  if (!enrichment) {
    return { kind: 'error', message: 'Incomplete poem data' };
  }
  return { kind: 'found', data: buildPoemResource(poem, related_poems, enrichment) };
}
