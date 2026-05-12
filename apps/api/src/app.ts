import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { DEV_WEB_URL, PROD_SITE_URL } from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { dbMiddleware } from './middlewares/db.middleware';
import serveEmojiFavicon from './middlewares/favicon.middleware';
import { router } from './router';
import index from './routes/index.routes';
import poems from './routes/poems.routes';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

app.use(
  cors({
    origin: [DEV_WEB_URL, PROD_SITE_URL],
    allowMethods: ['GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 600,
    credentials: true,
  })
);
app.use(dbMiddleware);
app.use(serveEmojiFavicon('📜'));

const orpcHandler = new OpenAPIHandler(router);

app.use('*', async (c, next) => {
  const result = await orpcHandler.handle(c.req.raw, {
    context: { db: c.get('db') },
  });
  if (result.matched) return result.response;
  return next();
});

app
  .route('/', index)
  .route('/poems', poems)
  .onError((error, c) => {
    console.error({
      message: 'Global error handler caught an error',
      path: c.req.path,
      method: c.req.method,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }

    return c.json({ success: false, error: 'Internal Server Error. Global', status: 500 }, 500);
  });

export default app;
export type { AppRouter } from './router';
