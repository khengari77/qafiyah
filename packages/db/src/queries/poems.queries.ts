import { MAX_EXCERPT_LENGTH } from '@qafiyah/constants';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { poemsFullData } from '../schema';
import { extractPoemExcerpt, type RandomPoemLines } from '../utils/extract-poem-excerpt';
import { processPoemContent } from '../utils/process-poem-content';

type RawPoemData = {
  slug: string;
  title: string;
  content: string;
  poet_name: string;
  poet_slug: string;
  meter_name: string;
  theme_name: string;
  era_name: string;
  era_slug: string;
};

type RawRelatedPoem = {
  poem_slug: string;
  poet_name: string;
  meter_name: string;
  poem_title: string;
};

type PoemWithRelatedSuccess = {
  poem: RawPoemData;
  related_poems: RawRelatedPoem[];
};

type PoemWithRelatedError = {
  error: string;
  message?: string;
};

type PoemWithRelatedResponse = PoemWithRelatedSuccess | PoemWithRelatedError;

export type ListAllPoemSlugsResult = {
  slugs: string[];
  total: number;
};

export async function listAllPoemSlugs(db: DbClient): Promise<ListAllPoemSlugsResult> {
  const rows = await db.select({ slug: poemsFullData.slug }).from(poemsFullData);
  const slugs = rows.map((r) => r.slug);
  return { slugs, total: slugs.length };
}

export async function getRandomPoemLines(db: DbClient): Promise<string> {
  const result = await db.execute(sql`SELECT get_random_eligible_poem()`);

  if (!result?.length || !result[0]?.['get_random_eligible_poem']) {
    throw new Error('getRandomPoemLines: SQL returned no eligible poem');
  }

  const poemJson = result[0]['get_random_eligible_poem'];
  const poem: RandomPoemLines = typeof poemJson === 'string' ? JSON.parse(poemJson) : poemJson;

  if (!poem?.content) {
    throw new Error('getRandomPoemLines: poem missing content field');
  }

  const content = extractPoemExcerpt(poem);

  if (content.length > MAX_EXCERPT_LENGTH) {
    throw new Error(
      `getRandomPoemLines: excerpt length ${content.length} exceeds MAX_EXCERPT_LENGTH ${MAX_EXCERPT_LENGTH}`
    );
  }

  return content;
}

export async function getRandomPoemSlug(db: DbClient): Promise<string> {
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

  return value.slug;
}

export type RelatedPoem = {
  title: string;
  slug: string;
  poetName: string;
  poetSlug: string;
  meterName: string;
  meterSlug: string;
};

export type PoemResourceData = {
  metadata: {
    poetName: string;
    poetSlug: string;
    eraName: string;
    eraSlug: string;
    meterName: string;
    meterSlug: string;
    themeName: string;
    themeSlug: string;
  };
  clearTitle: string;
  processedContent: ReturnType<typeof processPoemContent>;
  relatedPoems: RelatedPoem[];
};

type GetPoemResult =
  | { type: 'found'; data: PoemResourceData }
  | { type: 'not_found' }
  | { type: 'error'; message: string };

type MeterLookupRow = { slug: string };
type ThemeLookupRow = { slug: string };
type RelatedEnrichmentRow = {
  poem_slug: string;
  poet_slug: string;
  meter_slug: string;
};

function textArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

export async function getPoemBySlug(db: DbClient, slug: string): Promise<GetPoemResult> {
  const result = await db.execute(sql`SELECT get_poem_with_related(${slug})`);

  if (!result?.length || !result[0]?.['get_poem_with_related']) {
    return { type: 'not_found' };
  }

  const uncheckedData = result[0]['get_poem_with_related'] as PoemWithRelatedResponse;

  if ('error' in uncheckedData) {
    return { type: 'error', message: uncheckedData.message || uncheckedData.error };
  }

  const { poem, related_poems } = uncheckedData;

  if (
    !poem?.title ||
    !poem.content ||
    !poem.poet_name ||
    !poem.poet_slug ||
    !poem.meter_name ||
    !poem.theme_name ||
    !poem.era_name ||
    !poem.era_slug
  ) {
    console.error(`Incomplete poem data for slug: ${slug}`);
    return { type: 'error', message: 'Incomplete poem data' };
  }

  const relatedSlugs = related_poems.map((r) => r.poem_slug);

  const [meterLookup, themeLookup, relatedEnrichment] = await Promise.all([
    db.execute(
      sql`SELECT slug FROM public.meters WHERE name = ${poem.meter_name} LIMIT 1`
    ) as unknown as Promise<MeterLookupRow[]>,
    db.execute(
      sql`SELECT slug FROM public.themes WHERE name = ${poem.theme_name} LIMIT 1`
    ) as unknown as Promise<ThemeLookupRow[]>,
    relatedSlugs.length === 0
      ? Promise.resolve([] as RelatedEnrichmentRow[])
      : (db.execute(sql`
          SELECT
            p.slug::TEXT AS poem_slug,
            pt.slug AS poet_slug,
            m.slug AS meter_slug
          FROM public.poems p
          JOIN public.poets pt ON p.poet_id = pt.id
          JOIN public.meters m ON p.meter_id = m.id
          WHERE p.slug::TEXT = ANY(${textArrayLiteral(relatedSlugs)}::TEXT[])
        `) as unknown as Promise<RelatedEnrichmentRow[]>),
  ]);

  const meterSlug = meterLookup[0]?.slug;
  const themeSlug = themeLookup[0]?.slug;

  if (!meterSlug || !themeSlug) {
    console.error(`Missing meter or theme slug for poem ${slug}`);
    return { type: 'error', message: 'Incomplete poem data' };
  }

  const enrichmentMap = new Map(relatedEnrichment.map((r) => [r.poem_slug, r]));

  const clearTitle = poem.title.replace(/"/g, '');
  const processedContent = processPoemContent(poem.content);

  const relatedPoems: RelatedPoem[] = related_poems.map((r) => {
    const enriched = enrichmentMap.get(r.poem_slug);
    return {
      title: r.poem_title,
      slug: r.poem_slug,
      poetName: r.poet_name,
      poetSlug: enriched?.poet_slug ?? '',
      meterName: r.meter_name,
      meterSlug: enriched?.meter_slug ?? '',
    };
  });

  return {
    type: 'found',
    data: {
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
      clearTitle,
      processedContent,
      relatedPoems,
    },
  };
}
