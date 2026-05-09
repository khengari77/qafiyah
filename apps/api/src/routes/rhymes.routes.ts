import { zValidator } from '@hono/zod-validator';
import { rhymesQueries } from '@qafiyah/db';
import { getRhymesPoemsRequestSchema } from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    const db = c.get('db');
    const rhymes = await rhymesQueries.listRhymes(db);
    return c.json(createValidatedResponse('rhymesList', rhymes));
  })
  .get('/:slug/page/:page', zValidator('param', getRhymesPoemsRequestSchema), async (c) => {
    const { slug, page } = c.req.valid('param');
    const db = c.get('db');

    const result = await rhymesQueries.listRhymePoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Rhyme not found' });
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
        'rhymesPoems',
        { rhymeDetails: result.rhymeDetails, poems: result.poems },
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
      { success: false, error: 'Internal Server Error. RHYMES Route', status: 500 },
      500
    );
  });

export default app;
