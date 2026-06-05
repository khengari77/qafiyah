import { GITHUB_REPO_URL, PROD_SITE_URL } from '@qafiyah/constants';
import { Hono } from 'hono';
import { LLMS_CACHE_CONTROL, PROD_API_V1_BASE, SITE_NAME_EN } from '@/constants';
import type { AppContext } from '@/types';

const BASE = PROD_API_V1_BASE;

const body = `# ${SITE_NAME_EN} API

> Public read-only HTTP API for the ${SITE_NAME_EN} Arabic poetry catalog. JSON over HTTPS, no authentication required.

Base URL: ${BASE}

## Documentation

- [OpenAPI spec](${BASE}/openapi.json): Machine-readable OpenAPI 3 specification
- [Interactive reference](${BASE}/docs): Rendered API docs

## Endpoints

- [GET /v1/poems](${BASE}/poems): List and filter poems — query params: page, poet, era, theme, meter, rhyme, collection (slug filters repeatable)
- [GET /v1/poems/{slug}](${BASE}/poems): Full poem by slug
- [GET /v1/poems/slugs](${BASE}/poems/slugs): Poem slugs, paginated (for sitemaps)
- [GET /v1/poems/count](${BASE}/poems/count): Total number of poems
- [GET /v1/poems/random](${BASE}/poems/random): Random poem as text/plain (append ?option=lines for verse content)
- [GET /v1/poets](${BASE}/poets): List poets — query params: page, era
- [GET /v1/poets/{slug}](${BASE}/poets): Poet by slug
- [GET /v1/eras](${BASE}/eras): List historical eras with counts
- [GET /v1/eras/{slug}](${BASE}/eras): Era by slug
- [GET /v1/meters](${BASE}/meters): List classical Arabic meters with counts
- [GET /v1/meters/{slug}](${BASE}/meters): Meter by slug
- [GET /v1/rhymes](${BASE}/rhymes): List rhyme letters with counts
- [GET /v1/rhymes/{slug}](${BASE}/rhymes): Rhyme by slug
- [GET /v1/themes](${BASE}/themes): List themes with counts
- [GET /v1/themes/{slug}](${BASE}/themes): Theme by slug
- [GET /v1/collections](${BASE}/collections): List curated collections with counts
- [GET /v1/collections/{slug}](${BASE}/collections): Collection by slug
- [GET /v1/search](${BASE}/search): Full-text search across poems and poets — query params: q, types, matchType, poemsPage, poetsPage, and slug filters

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
