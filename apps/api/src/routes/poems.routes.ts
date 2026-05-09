import { poemsQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>();
app
  .get('/slugs', async (c) => {
    const db = c.get('db');
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const limit = Math.max(1, Number(c.req.query('limit')) || 1000);

    const result = await poemsQueries.listPoemSlugs(db, page, limit);

    return c.json({
      success: true,
      data: result.slugs,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  })
  .get('/random', async (c) => {
    const option = c.req.query('option') ?? 'slug';
    const db = c.get('db');

    c.header('Cache-Control', 'no-store');
    c.header('Content-Type', 'text/plain; charset=utf-8');

    if (option === 'lines') {
      const content = await poemsQueries.getRandomPoemLines(db);
      return c.text(content);
    }

    const slug = await poemsQueries.getRandomPoemSlug(db);
    return c.text(slug);
  })
  .get('/slug/:slug', async (c) => {
    const slug = c.req.param('slug');
    const db = c.get('db');

    const result = await poemsQueries.getPoemBySlug(db, slug);

    if (result.type === 'not_found') {
      throw new HTTPException(404, { message: 'Poem not found' });
    }

    if (result.type === 'error') {
      throw new HTTPException(400, { message: result.message });
    }

    return c.json({ success: true, data: result.data });
  })
  .onError((error, c) => {
    console.error(error);
    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }
    return c.json(
      { success: false, error: 'Internal Server Error. POEMS Route', status: 500 },
      500
    );
  });

export default app;
