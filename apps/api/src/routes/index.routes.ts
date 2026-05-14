import { Hono } from 'hono';
import type { AppContext } from '@/types';

const app = new Hono<AppContext>().get('/', (c) => c.redirect('/v1/docs', 302));

export default app;
