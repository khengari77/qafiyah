import { Hono } from 'hono';
import { API_DOCS_PATH, REDIRECT_TO_DOCS_STATUS } from '@/constants';
import type { AppContext } from '@/types';

const app = new Hono<AppContext>().get('/', (c) =>
  c.redirect(API_DOCS_PATH, REDIRECT_TO_DOCS_STATUS)
);

export default app;
