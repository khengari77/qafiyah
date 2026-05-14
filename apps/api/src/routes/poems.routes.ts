import { poemsQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

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
      return sendProblem(
        c,
        makeProblem({
          code: error.status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
          status: error.status,
          detail: error.message,
        })
      );
    }
    console.error(error);
    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        detail: 'Failed to handle poems route',
      })
    );
  });

export default app;
