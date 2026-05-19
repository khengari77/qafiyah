import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import { API_V1_PREFIX, GITHUB_REPO_URL } from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { match, P } from 'ts-pattern';
import {
  API_DESCRIPTION,
  API_OPENAPI_DOCS_PATH,
  API_OPENAPI_SPEC_PATH,
  API_VERSION,
  CORS_MAX_AGE_SECONDS,
  FAVICON_EMOJI,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  LICENSE_NAME,
  ORPC_BYPASS_PATHS,
  SITE_NAME_EN,
} from './constants';
import { type DomainFields, enrichContext, recordError } from './lib/logger';
import { makeProblem, sendProblem, transformOrpcResponse } from './lib/problem';
import { dbMiddleware } from './middlewares/db.middleware';
import { serveEmojiFavicon } from './middlewares/favicon.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
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
app.use(loggerMiddleware);

for (const ns of routerNamespaces) {
  app.use(`${API_V1_PREFIX}/${ns}/*`, dbMiddleware);
}

const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
      specPath: API_OPENAPI_SPEC_PATH,
      docsPath: API_OPENAPI_DOCS_PATH,
      specGenerateOptions: ({ request }) => ({
        info: {
          title: `${SITE_NAME_EN} API`,
          version: API_VERSION,
          description: API_DESCRIPTION,
          contact: { name: SITE_NAME_EN, url: GITHUB_REPO_URL },
          license: { name: LICENSE_NAME },
        },
        servers: [{ url: `${request.url.origin}${API_V1_PREFIX}` }],
      }),
    }),
  ],
});

app.use(`${API_V1_PREFIX}/*`, async (c, next) => {
  if (ORPC_BYPASS_PATHS.has(c.req.path)) return next();
  const result = await orpcHandler.handle(c.req.raw, {
    context: { db: c.get('db'), log: (data: DomainFields) => enrichContext(c, data) },
    prefix: API_V1_PREFIX,
  });
  if (!result.matched) return next();
  return transformOrpcResponse(result.response, c.req.path);
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
    const { code, status, detail } = match(error)
      .with(P.instanceOf(HTTPException), (e) => ({
        code: e.status === HTTP_NOT_FOUND ? ('NOT_FOUND' as const) : ('BAD_REQUEST' as const),
        status: e.status,
        detail: e.message,
      }))
      .otherwise(() => ({
        code: 'INTERNAL_SERVER_ERROR' as const,
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Unexpected server error',
      }));

    const handle = c.var.logHandle;
    if (handle) {
      recordError(handle, {
        type: error.constructor.name,
        code,
        message: error.message,
        retriable: status >= HTTP_INTERNAL_SERVER_ERROR,
      });
    }

    return sendProblem(c, makeProblem({ code, status, detail }));
  });

export default app;
