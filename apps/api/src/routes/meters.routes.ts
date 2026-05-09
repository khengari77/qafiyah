import { zValidator } from '@hono/zod-validator';
import { metersQueries } from '@qafiyah/db';
import { getMetersPoemsRequestSchema } from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    const db = c.get('db');
    const meters = await metersQueries.listMeters(db);
    return c.json(createValidatedResponse('metersList', meters));
  })
  .get('/:slug/page/:page', zValidator('param', getMetersPoemsRequestSchema), async (c) => {
    const { slug, page } = c.req.valid('param');
    const db = c.get('db');

    const result = await metersQueries.listMeterPoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Meter not found' });
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
        'metersPoems',
        { meterDetails: result.meterDetails, poems: result.poems },
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
      { success: false, error: 'Internal Server Error. METERS Route', status: 500 },
      500
    );
  });

export default app;
