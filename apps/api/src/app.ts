import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import { GITHUB_REPO_URL, PROD_API_URL, SITE_NAME_EN } from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { makeProblem, sendProblem, transformOrpcResponse } from './lib/problem';
import { dbMiddleware } from './middlewares/db.middleware';
import serveEmojiFavicon from './middlewares/favicon.middleware';
import { router, routerNamespaces } from './router';
import index from './routes/index.routes';
import poems from './routes/poems.routes';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    maxAge: 600,
    credentials: false,
  })
);
app.use(serveEmojiFavicon('📜'));

for (const ns of routerNamespaces) {
  app.use(`/v1/${ns}/*`, dbMiddleware);
}

const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
      specPath: '/openapi.json',
      docsPath: '/docs',
      specGenerateOptions: {
        info: {
          title: `${SITE_NAME_EN} API`,
          version: '1.0.0',
          description: 'Public read-only API for the Qafiyah Arabic poetry catalog.',
          contact: { name: SITE_NAME_EN, url: GITHUB_REPO_URL },
          license: { name: 'MIT' },
        },
        servers: [
          { url: `${PROD_API_URL}/v1`, description: 'Production' },
          { url: 'http://127.0.0.1:8787/v1', description: 'Local dev' },
        ],
      },
    }),
  ],
});

const ORPC_BYPASS_PATHS = new Set(['/v1', '/v1/poems/random']);

app.use('/v1/*', async (c, next) => {
  if (ORPC_BYPASS_PATHS.has(c.req.path)) return next();
  const result = await orpcHandler.handle(c.req.raw, {
    context: { db: c.get('db') },
    prefix: '/v1',
  });
  if (!result.matched) return next();
  return transformOrpcResponse(result.response);
});

app
  .route('/', index)
  .route('/v1', index)
  .route('/v1/poems', poems)
  .notFound((c) =>
    sendProblem(
      c,
      makeProblem({
        code: 'NOT_FOUND',
        status: 404,
        detail: `No route matches ${c.req.method} ${c.req.path}`,
      })
    )
  )
  .onError((error, c) => {
    console.error({
      message: 'Global error handler caught an error',
      path: c.req.path,
      method: c.req.method,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof HTTPException) {
      return sendProblem(
        c,
        makeProblem({
          code: error.status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
          status: error.status,
          detail: error.message,
        })
      );
    }

    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        detail: 'Unexpected server error',
      })
    );
  });

export default app;
