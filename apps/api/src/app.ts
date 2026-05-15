import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import {
  API_OPENAPI_DOCS_PATH,
  API_OPENAPI_SPEC_PATH,
  API_SPEC_DESCRIPTION,
  API_SPEC_LICENSE_NAME,
  API_SPEC_VERSION,
  API_V1_PREFIX,
  CORS_MAX_AGE_SECONDS,
  DEV_API_LOOPBACK_URL,
  FAVICON_EMOJI,
  GITHUB_REPO_URL,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  ORPC_BYPASS_PATHS,
  PROD_API_URL,
  SITE_NAME_EN,
} from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { makeProblem, sendProblem, transformOrpcResponse } from './lib/problem';
import { dbMiddleware } from './middlewares/db.middleware';
import serveEmojiFavicon from './middlewares/favicon.middleware';
import { router, routerNamespaces } from './router';
import index from './routes/index.routes';
import llms from './routes/llms.routes';
import poems from './routes/poems.routes';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    maxAge: CORS_MAX_AGE_SECONDS,
    credentials: false,
  })
);
app.use(serveEmojiFavicon(FAVICON_EMOJI));

for (const ns of routerNamespaces) {
  app.use(`${API_V1_PREFIX}/${ns}/*`, dbMiddleware);
}

const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
      specPath: API_OPENAPI_SPEC_PATH,
      docsPath: API_OPENAPI_DOCS_PATH,
      specGenerateOptions: {
        info: {
          title: `${SITE_NAME_EN} API`,
          version: API_SPEC_VERSION,
          description: API_SPEC_DESCRIPTION,
          contact: { name: SITE_NAME_EN, url: GITHUB_REPO_URL },
          license: { name: API_SPEC_LICENSE_NAME },
        },
        servers: [
          { url: `${PROD_API_URL}${API_V1_PREFIX}`, description: 'Production' },
          { url: `${DEV_API_LOOPBACK_URL}${API_V1_PREFIX}`, description: 'Local dev' },
        ],
      },
    }),
  ],
});

app.use(`${API_V1_PREFIX}/*`, async (c, next) => {
  if (ORPC_BYPASS_PATHS.has(c.req.path)) return next();
  const result = await orpcHandler.handle(c.req.raw, {
    context: { db: c.get('db') },
    prefix: API_V1_PREFIX,
  });
  if (!result.matched) return next();
  return transformOrpcResponse(result.response);
});

app
  .route('/', index)
  .route('/', llms)
  .route(API_V1_PREFIX, index)
  .route(`${API_V1_PREFIX}/poems`, poems)
  .notFound((c) =>
    sendProblem(
      c,
      makeProblem({
        code: 'NOT_FOUND',
        status: HTTP_NOT_FOUND,
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
          code: error.status === HTTP_NOT_FOUND ? 'NOT_FOUND' : 'BAD_REQUEST',
          status: error.status,
          detail: error.message,
        })
      );
    }

    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Unexpected server error',
      })
    );
  });

export default app;
