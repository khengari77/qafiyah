import { zValidator } from '@hono/zod-validator';
import { erasQueries } from '@qafiyah/db';
import { getErasPoemsRequestSchema } from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    const db = c.get('db');
    const eras = await erasQueries.listEras(db);
    return c.json(createValidatedResponse('erasList', eras));
  })
  .get('/:slug/page/:page', zValidator('param', getErasPoemsRequestSchema), async (c) => {
    const { slug, page } = c.req.valid('param');
    const db = c.get('db');

    const result = await erasQueries.listEraPoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Era not found' });
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
        'erasPoems',
        { eraDetails: result.eraDetails, poems: result.poems },
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

    return c.json({ success: false, error: 'Internal Server Error. ERAS Route', status: 500 }, 500);
  });

export default app;
