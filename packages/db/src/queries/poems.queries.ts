import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { MAX_EXCERPT_LENGTH } from '../constants';
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

type GetPoemResult =
  | {
      type: 'found';
      data: {
        metadata: {
          poetName: string;
          poetSlug: string;
          eraName: string;
          eraSlug: string;
          meterName: string;
          themeName: string;
        };
        clearTitle: string;
        processedContent: ReturnType<typeof processPoemContent>;
        relatedPoems: {
          title: string;
          slug: string;
          poetName: string;
          meter: string;
        }[];
      };
    }
  | { type: 'not_found' }
  | { type: 'error'; message: string };

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

  const clearTitle = poem.title.replace(/"/g, '');
  const processedContent = processPoemContent(poem.content);

  return {
    type: 'found',
    data: {
      metadata: {
        poetName: poem.poet_name,
        poetSlug: poem.poet_slug,
        eraName: poem.era_name,
        eraSlug: poem.era_slug,
        meterName: poem.meter_name,
        themeName: poem.theme_name,
      },
      clearTitle,
      processedContent,
      relatedPoems: related_poems.map((r) => ({
        title: r.poem_title,
        slug: r.poem_slug,
        poetName: r.poet_name,
        meter: r.meter_name,
      })),
    },
  };
}
