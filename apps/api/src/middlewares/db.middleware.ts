import { HTTP_SERVICE_UNAVAILABLE } from '@qafiyah/constants';
import { createDb } from '@qafiyah/db';
import { createMiddleware } from 'hono/factory';
import { parseBindings } from '@/env';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  try {
    const { DATABASE_URL } = parseBindings(c.env);
    const db = createDb(DATABASE_URL);
    c.set('db', db);
    return await next();
  } catch (error) {
    console.error('Database error:', error);
    return sendProblem(
      c,
      makeProblem({
        code: 'SERVICE_UNAVAILABLE',
        status: HTTP_SERVICE_UNAVAILABLE,
        detail: 'Database unavailable',
      })
    );
  }
});
