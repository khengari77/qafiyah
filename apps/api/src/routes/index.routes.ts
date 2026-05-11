import { GITHUB_REPO_URL, SITE_NAME_EN } from '@qafiyah/constants';
import { Hono } from 'hono';
import type { AppContext } from '../types';

const app = new Hono<AppContext>().get('/', (c) => {
  return c.text(
    `${SITE_NAME_EN} API Reference

Health Check:
- GET /

Eras:
- GET /eras
- GET /eras/:slug/page/:page

Meters:
- GET /meters
- GET /meters/:slug/page/:page

Poems:
- GET /poems/random
- GET /poems/slug/:slug

Poets:
- GET /poets/page/:page
- GET /poets/slug/:slug
- GET /poets/:slug/page/:page

Rhymes:
- GET /rhymes
- GET /rhymes/:slug/page/:page

Search:
- GET /search
  (params: q, search_type, page, match_type)

Sitemaps:
- GET /sitemaps

Themes:
- GET /themes
- GET /themes/:slug/page/:page

Repository:
${GITHUB_REPO_URL}`
  );
});

export default app;
