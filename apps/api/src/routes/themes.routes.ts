import { themesQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    const db = c.get('db');
    const themes = await themesQueries.listThemes(db);
    return c.json({ success: true, data: themes });
  })
  .get('/:slug/page/:page', async (c) => {
    const slug = c.req.param('slug');
    const page = Math.max(1, Number(c.req.param('page')) || 1);
    const db = c.get('db');

    const result = await themesQueries.listThemePoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Theme not found' });
    }

    return c.json({
      success: true,
      data: { themeDetails: result.themeDetails, poems: result.poems },
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
    console.error(error);
    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }
    return c.json(
      { success: false, error: 'Internal Server Error. THEMES Route', status: 500 },
      500
    );
  });

export default app;
