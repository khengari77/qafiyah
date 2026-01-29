import { zValidator } from '@hono/zod-validator';
import { getPoemBySlugRequestSchema, getRandomPoemRequestSchema } from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  FALLBACK_RANDOM_POEM_LINES,
  FALLBACK_RANDOM_POEM_SLUG,
  MAX_EXCERPT_LENGTH,
  MAX_URLS_PER_SITEMAP,
} from '../constants';
import { poemsFullData } from '../schemas/db';
import type { AppContext, PoemWithRelatedResponse, RandomPoemLines } from '../types';
import { extractPoemExcerpt } from '../utils/extract-poem-excerpt';
import { processPoemContent } from '../utils/process-poem-content';

const app = new Hono<AppContext>();
app
  // Endpoint for fetching poem slugs for static generation
  .get('/slugs', async (c) => {
    const db = c.get('db');
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || MAX_URLS_PER_SITEMAP);

    const offset = (page - 1) * limit;
    const poems = await db
      .select({ slug: poemsFullData.slug })
      .from(poemsFullData)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination info
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql`count(*)` })
      .from(poemsFullData);

    return c.json({
      success: true,
      data: poems,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  })
  .get('/random', zValidator('query', getRandomPoemRequestSchema), async (c) => {
    const { option } = c.req.valid('query');
    const db = c.get('db');

    c.header('Cache-Control', 'no-store');
    c.header('Content-Type', 'text/plain; charset=utf-8');

    try {
      if (option === 'lines') {
        const result = await db.execute(sql`SELECT get_random_eligible_poem()`);

        if (!result?.length || !result[0]?.get_random_eligible_poem) {
          throw new Error('No poem found');
        }

        const poemJson = result[0].get_random_eligible_poem;
        const poem: RandomPoemLines =
          typeof poemJson === 'string' ? JSON.parse(poemJson) : poemJson;

        if (!poem?.content) {
          throw new Error('Invalid poem format');
        }

        const content = extractPoemExcerpt(poem);

        if (content.length > MAX_EXCERPT_LENGTH) {
          throw new Error('Poem excerpt too long');
        }

        return c.text(content);
      }

      const result = await db.execute(sql`SELECT get_random_eligible_poem_slug()`);

      const row = result?.[0];

      if (!row || !row.get_random_eligible_poem_slug) {
        throw new Error('No poem slug found');
      }

      const slug =
        typeof row.get_random_eligible_poem_slug === 'object' &&
        row.get_random_eligible_poem_slug !== null &&
        'slug' in row.get_random_eligible_poem_slug &&
        typeof row.get_random_eligible_poem_slug.slug === 'string'
          ? row.get_random_eligible_poem_slug.slug
          : FALLBACK_RANDOM_POEM_SLUG;

      return c.text(slug);
    } catch (error) {
      console.error('Error fetching random poem:', error);
      c.header('Content-Type', 'text/plain; charset=utf-8');

      if (option === 'lines') {
        return c.text(FALLBACK_RANDOM_POEM_LINES);
      }
      return c.text(FALLBACK_RANDOM_POEM_SLUG);
    }
  })
  .get('/slug/:slug', zValidator('param', getPoemBySlugRequestSchema), async (c) => {
    const { slug } = c.req.valid('param');
    const db = c.get('db');

    const result = await db.execute(sql`SELECT get_poem_with_related(${slug})`);

    if (!result || !result.length || !result[0] || !result[0].get_poem_with_related) {
      throw new HTTPException(404, { message: 'Poem not found' });
    }

    const uncheckedResponseData = result[0].get_poem_with_related as PoemWithRelatedResponse;

    if ('error' in uncheckedResponseData) {
      throw new HTTPException(400, {
        message: uncheckedResponseData.message || uncheckedResponseData.error,
      });
    }

    const { poem, related_poems } = uncheckedResponseData;

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
      throw new HTTPException(500, { message: 'Incomplete poem data' });
    }

    const clearTitle = poem.title.replace(/"/g, '');
    const processedContent = processPoemContent(poem.content);

    const responseData = {
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
    };

    return c.json(createValidatedResponse('poemDetail', responseData));
  })
  //! ERR HANDLING ------------------------------------------>
  .onError((error, c) => {
    console.error(error);

    if (error instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        error.status
      );
    }

    return c.json(
      {
        success: false,
        error: 'Internal Server Error. POEMS Route',
        status: 500,
      },
      500
    );
  });

export default app;
