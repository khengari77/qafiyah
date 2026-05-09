import { zValidator } from '@hono/zod-validator';
import { poetsQueries } from '@qafiyah/db';
import {
  getPoetPoemsRequestSchema,
  getPoetRequestSchema,
  getPoetsRequestSchema,
} from '@qafiyah/schemas';
import { createValidatedResponse } from '@qafiyah/schemas/server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppContext } from '../types';

const app = new Hono<AppContext>()
  .get('/page/:page', zValidator('param', getPoetsRequestSchema), async (c) => {
    const { page } = c.req.valid('param');
    const db = c.get('db');

    const result = await poetsQueries.listPoets(db, page);

    if (result.poets.length === 0) {
      throw new HTTPException(404, { message: 'No poets found for this page' });
    }

    const paginationMeta = {
      pagination: {
        currentPage: page,
        totalPages: result.totalPages,
        totalItems: result.totalPoets,
        hasNextPage: page < result.totalPages,
        hasPrevPage: page > 1,
      },
    };

    return c.json(createValidatedResponse('poetsList', { poets: result.poets }, paginationMeta));
  })
  .get('/slug/:slug', zValidator('param', getPoetRequestSchema), async (c) => {
    const { slug } = c.req.valid('param');
    const db = c.get('db');

    const result = await poetsQueries.getPoetBySlug(db, slug);

    if (!result) {
      throw new HTTPException(404, { message: 'Poet not found' });
    }

    return c.json(createValidatedResponse('poetBasicInfo', result));
  })
  .get('/:slug/page/:page', zValidator('param', getPoetPoemsRequestSchema), async (c) => {
    const { slug, page } = c.req.valid('param');
    const db = c.get('db');

    const result = await poetsQueries.listPoetPoems(db, slug, page);

    if (!result) {
      throw new HTTPException(404, { message: 'Poet not found' });
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
        'poetPoems',
        { poetDetails: result.poetDetails, poems: result.poems },
        paginationMeta
      )
    );
  })
  .onError((error, c) => {
    console.error(error);

    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }

    return c.json(
      { success: false, error: 'Internal Server Error. POETS Route', status: 500 },
      500
    );
  });

export default app;
