import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import {
  FALLBACK_RANDOM_POEM_LINES,
  FALLBACK_RANDOM_POEM_SLUG,
  MAX_EXCERPT_LENGTH,
  MAX_URLS_PER_SITEMAP,
} from '../constants';
import { poemsFullData } from '../schema';
import type { PoemWithRelatedResponse, RandomPoemLines } from '../types';
import { extractPoemExcerpt } from '../utils/extract-poem-excerpt';
import { processPoemContent } from '../utils/process-poem-content';

export async function listPoemSlugs(
  db: DbClient,
  page: number,
  limit: number = MAX_URLS_PER_SITEMAP
) {
  const offset = (page - 1) * limit;
  const slugs = await db.select({ slug: poemsFullData.slug }).from(poemsFullData).limit(limit).offset(offset);

  const [{ count } = { count: 0 }] = await db.select({ count: sql`count(*)` }).from(poemsFullData);
  const total = Number(count);

  return { slugs, total, totalPages: Math.ceil(total / limit) };
}

export async function getRandomPoemLines(db: DbClient): Promise<string> {
  try {
    const result = await db.execute(sql`SELECT get_random_eligible_poem()`);

    if (!result?.length || !result[0]?.get_random_eligible_poem) {
      throw new Error('No poem found');
    }

    const poemJson = result[0].get_random_eligible_poem;
    const poem: RandomPoemLines = typeof poemJson === 'string' ? JSON.parse(poemJson) : poemJson;

    if (!poem?.content) throw new Error('Invalid poem format');

    const content = extractPoemExcerpt(poem);

    if (content.length > MAX_EXCERPT_LENGTH) throw new Error('Poem excerpt too long');

    return content;
  } catch {
    return FALLBACK_RANDOM_POEM_LINES;
  }
}

export async function getRandomPoemSlug(db: DbClient): Promise<string> {
  try {
    const result = await db.execute(sql`SELECT get_random_eligible_poem_slug()`);
    const row = result?.[0];

    if (!row || !row.get_random_eligible_poem_slug) throw new Error('No poem slug found');

    const slug =
      typeof row.get_random_eligible_poem_slug === 'object' &&
      row.get_random_eligible_poem_slug !== null &&
      'slug' in row.get_random_eligible_poem_slug &&
      typeof row.get_random_eligible_poem_slug.slug === 'string'
        ? row.get_random_eligible_poem_slug.slug
        : FALLBACK_RANDOM_POEM_SLUG;

    return slug;
  } catch {
    return FALLBACK_RANDOM_POEM_SLUG;
  }
}

export type GetPoemResult =
  | { type: 'found'; data: { metadata: { poet_name: string; poet_slug: string; era_name: string; era_slug: string; meter_name: string; theme_name: string }; clearTitle: string; processedContent: ReturnType<typeof processPoemContent>; relatedPoems: { poem_slug: string; poet_name: string; meter_name: string; poem_title: string }[] } }
  | { type: 'not_found' }
  | { type: 'error'; message: string };

export async function getPoemBySlug(db: DbClient, slug: string): Promise<GetPoemResult> {
  const result = await db.execute(sql`SELECT get_poem_with_related(${slug})`);

  if (!result?.length || !result[0] || !result[0].get_poem_with_related) {
    return { type: 'not_found' };
  }

  const uncheckedData = result[0].get_poem_with_related as PoemWithRelatedResponse;

  if ('error' in uncheckedData) {
    return { type: 'error', message: uncheckedData.message || uncheckedData.error };
  }

  const { poem, related_poems } = uncheckedData;

  if (
    !poem ||
    !poem.title ||
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
        poet_name: poem.poet_name,
        poet_slug: poem.poet_slug,
        era_name: poem.era_name,
        era_slug: poem.era_slug,
        meter_name: poem.meter_name,
        theme_name: poem.theme_name,
      },
      clearTitle,
      processedContent,
      relatedPoems: related_poems,
    },
  };
}
