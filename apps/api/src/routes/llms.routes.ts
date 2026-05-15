import {
  API_V1_PREFIX,
  GITHUB_REPO_URL,
  LLMS_CACHE_CONTROL,
  PROD_API_URL,
  PROD_SITE_URL,
  SITE_NAME_EN,
} from '@qafiyah/constants';
import { Hono } from 'hono';
import type { AppContext } from '@/types';

const BASE = `${PROD_API_URL}${API_V1_PREFIX}`;

const body = `# ${SITE_NAME_EN} API

> Public read-only HTTP API for the ${SITE_NAME_EN} Arabic poetry catalog. JSON over HTTPS, no authentication required.

Base URL: ${BASE}

## Documentation

- [OpenAPI spec](${BASE}/openapi.json): Machine-readable OpenAPI 3 specification
- [Interactive reference](${BASE}/docs): Rendered API docs

## Endpoints

- [GET /v1/eras](${BASE}/eras): List historical eras with poem counts
- [GET /v1/eras/{slug}/page/{page}](${BASE}/eras): Poems by era, paginated
- [GET /v1/meters](${BASE}/meters): List classical Arabic meters
- [GET /v1/meters/{slug}/page/{page}](${BASE}/meters): Poems by meter, paginated
- [GET /v1/poets/page/{page}](${BASE}/poets/page/1): List poets, paginated
- [GET /v1/poets/{slug}/page/{page}](${BASE}/poets): Poems by poet, paginated
- [GET /v1/rhymes](${BASE}/rhymes): List rhyme letters with poem counts
- [GET /v1/rhymes/{slug}/page/{page}](${BASE}/rhymes): Poems by rhyme, paginated
- [GET /v1/themes](${BASE}/themes): List themes with poem counts
- [GET /v1/themes/{slug}/page/{page}](${BASE}/themes): Poems by theme, paginated
- [GET /v1/poems/slug/{slug}](${BASE}/poems): Full poem by slug
- [GET /v1/poems/slugs](${BASE}/poems/slugs): All poem slugs
- [GET /v1/poems/random](${BASE}/poems/random): Random poem slug as text/plain (append ?option=lines for content)
- [GET /v1/search](${BASE}/search): Full-text search across poems

## Source

- [GitHub](${GITHUB_REPO_URL})
- [Website](${PROD_SITE_URL})
`;

const app = new Hono<AppContext>().get('/llms.txt', (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', LLMS_CACHE_CONTROL);
  return c.body(body);
});

export default app;
