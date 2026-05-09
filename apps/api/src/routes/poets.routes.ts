import { poetsQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/page/:page', async (c) => {
    const page = Math.max(1, Number(c.req.param('page')) || 1);
    const db = c.get('db');

    const result = await poetsQueries.listPoets(db, page);

    if (result.poets.length === 0) {
      throw new HTTPException(404, { message: 'No poets found for this page' });
    }

    return c.json({
      success: true,
      data: { poets: result.poets },
      meta: {
        pagination: {
          currentPage: page,
          totalPages: result.totalPages,
          totalItems: result.totalPoets,
          hasNextPage: page < result.totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  })
  .get('/slug/:slug', async (c) => {
    const slug = c.req.param('slug');
    const db = c.get('db');

    const result = await poetsQueries.getPoetBySlug(db, slug);

    if (!result) {
      throw new HTTPException(404, { message: 'Poet not found' });
    }

    return c.json({ success: true, data: result });
  })
  .get('/:slug/page/:page', async (c) => {
    const slug = c.req.param('slug');
    const page = Math.max(1, Number(c.req.param('page')) || 1);
    const db = c.get('db');

    const result = await poetsQueries.listPoetPoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Poet not found' });
    }

    return c.json({
      success: true,
      data: { poetDetails: result.poetDetails, poems: result.poems },
      meta: {
        pagination: {
          currentPage: page,
          totalPages: result.totalPages,
          hasNextPage: page < result.totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  })
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }
    console.error(error);
    return c.json(
      { success: false, error: 'Internal Server Error. POETS Route', status: 500 },
      500
    );
  });

export default app;
