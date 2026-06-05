import { describe, expect, it } from 'vitest';
import { withReadCaching } from './http-cache';

const CC = 'public, max-age=300, stale-while-revalidate=86400';
const json = (body: string, init?: ResponseInit) =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
const WEAK_ETAG_REGEX = /^W\/"[0-9a-f]{16}"$/;

describe('withReadCaching', () => {
  it('sets a weak ETag and the Cache-Control on a 200 JSON response', async () => {
    const res = await withReadCaching(new Request('http://x/v1/poems'), json('{"a":1}'), CC);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(CC);
    expect(res.headers.get('ETag')).toMatch(WEAK_ETAG_REGEX);
    expect(await res.text()).toBe('{"a":1}');
  });

  it('is deterministic and content-sensitive', async () => {
    const a = await withReadCaching(new Request('http://x/v1/poems'), json('{"a":1}'), CC);
    const b = await withReadCaching(new Request('http://x/v1/poems'), json('{"a":1}'), CC);
    const c = await withReadCaching(new Request('http://x/v1/poems'), json('{"a":2}'), CC);
    expect(a.headers.get('ETag')).toBe(b.headers.get('ETag'));
    expect(a.headers.get('ETag')).not.toBe(c.headers.get('ETag'));
  });

  it('returns 304 with no body when If-None-Match matches (weak compare)', async () => {
    const first = await withReadCaching(new Request('http://x/v1/poems'), json('{"a":1}'), CC);
    const etag = first.headers.get('ETag') as string;
    const res = await withReadCaching(
      new Request('http://x/v1/poems', { headers: { 'If-None-Match': etag } }),
      json('{"a":1}'),
      CC
    );
    expect(res.status).toBe(304);
    expect(res.headers.get('ETag')).toBe(etag);
    expect(res.headers.get('Cache-Control')).toBe(CC);
    expect(await res.text()).toBe('');
  });

  it('does not cache error responses', async () => {
    const res = await withReadCaching(
      new Request('http://x/v1/poems'),
      json('{}', { status: 500 }),
      CC
    );
    expect(res.headers.get('ETag')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBeNull();
  });

  it('ignores non-JSON responses', async () => {
    const res = await withReadCaching(
      new Request('http://x'),
      new Response('hi', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      CC
    );
    expect(res.headers.get('ETag')).toBeNull();
  });
});
