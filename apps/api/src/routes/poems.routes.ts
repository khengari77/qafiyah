import { HTTP_NOT_FOUND } from '@qafiyah/constants';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';
import { makeProblem, sendProblem } from '@/lib/problem';
import { getRandomPoemText } from '@/services/random-poem';
import type { AppContext } from '@/types';
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR, NO_STORE_CACHE_CONTROL } from '../constants';

const optionSchema = v.optional(v.picklist(['slug', 'lines'] as const), 'slug');

const app = new Hono<AppContext>()
  .get('/random', async (c) => {
    const parsed = v.safeParse(optionSchema, c.req.query('option'));
    if (!parsed.success) {
      return sendProblem(
        c,
        makeProblem({
          code: 'BAD_REQUEST',
          status: HTTP_BAD_REQUEST,
          detail: `Invalid ?option value (expected 'slug' or 'lines')`,
        })
      );
    }

    c.header('Cache-Control', NO_STORE_CACHE_CONTROL);
    c.header('Content-Type', 'text/plain; charset=utf-8');

    const body = await getRandomPoemText(c.get('db'), parsed.output);
    return c.text(body);
  })
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return sendProblem(
        c,
        makeProblem({
          code: error.status === HTTP_NOT_FOUND ? 'NOT_FOUND' : 'BAD_REQUEST',
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
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Failed to handle poems route',
      })
    );
  });

export default app;
