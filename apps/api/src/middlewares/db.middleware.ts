import { createDb } from '@qafiyah/db';
import { createMiddleware } from 'hono/factory';
import type { AppContext } from '@/types';

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  try {
    const databaseUrl = c.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Database configuration missing');
    }

    const db = createDb(databaseUrl);
    c.set('db', db);
    return await next();
  } catch (error) {
    console.error('Database error:', error);
    return c.json(
      {
        success: false,
        error: 'Database unavailable',
        status: 503,
      },
      503
    );
  }
});
