/**
 * Tests for favicon middleware
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppContext } from '../types';
import serveEmojiFavicon from './favicon.middleware';

describe('favicon.middleware', () => {
  it('should serve favicon as SVG when path is /favicon.ico', async () => {
    const app = new Hono<AppContext>();
    app.use(serveEmojiFavicon('📜'));
    app.get('/test', (c) => c.text('ok'));

    const res = await app.fetch(new Request('http://localhost/favicon.ico'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<svg');
    expect(text).toContain('📜');
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=2592000, immutable');
  });

  it('should not interfere with other routes', async () => {
    const app = new Hono<AppContext>();
    app.use(serveEmojiFavicon('📜'));
    app.get('/test', (c) => c.text('ok'));

    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('ok');
  });

  it('should use the provided emoji in the SVG', async () => {
    const app = new Hono<AppContext>();
    app.use(serveEmojiFavicon('🔥'));
    app.get('/favicon.ico', (c) => c.text('fallback'));

    const res = await app.fetch(new Request('http://localhost/favicon.ico'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('🔥');
  });
});
