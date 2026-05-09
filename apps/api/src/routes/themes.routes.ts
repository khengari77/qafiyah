import { zValidator } from '@hono/zod-validator';
import { themesQueries } from '@qafiyah/db';
import { getThemesPoemsRequestSchema } from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    const db = c.get('db');
    const themes = await themesQueries.listThemes(db);
    return c.json(createValidatedResponse('themesList', themes));
  })
  .get('/:slug/page/:page', zValidator('param', getThemesPoemsRequestSchema), async (c) => {
    const { slug, page } = c.req.valid('param');
    const db = c.get('db');

    const result = await themesQueries.listThemePoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Theme not found' });
    }

    const paginationMeta = {
      pagination: {
        currentPage: page,
        totalPages: result.totalPages,
        hasNextPage: page < result.totalPages,
        hasPrevPage: page > 1,
      },
    };

    return c.json(
      createValidatedResponse(
        'themesPoems',
        { themeDetails: result.themeDetails, poems: result.poems },
        paginationMeta
      )
    );
  })
  .onError((error, c) => {
    console.error(error);

    if (error instanceof HTTPException) {
      return c.json(
        { success: false, error: error.message, status: error.status },
        error.status
      );
    }

    return c.json(
      { success: false, error: 'Internal Server Error. THEMES Route', status: 500 },
      500
    );
  });

export default app;
