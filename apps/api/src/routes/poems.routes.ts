import { poemsQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
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
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }
    console.error(error);
    return c.json(
      { success: false, error: 'Internal Server Error. POEMS Route', status: 500 },
      500
    );
  });

export default app;
