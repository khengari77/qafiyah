import { describe, expect, it } from 'vitest';
import app from '@/app';
import type { Bindings } from '@/env';
import { createTestClient } from '@/test-utils';
import llms from './llms.routes';

const CONTENT_TYPE_TEXT_REGEX = /^text\/plain/;
const QAFIYAH_API_HEADER_REGEX = /^# Qafiyah API/;

const TEST_ENV: Bindings = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ENVIRONMENT: 'test',
};

// Non-contract routes (raw Hono / plugin) that are not in the oRPC spec paths.
const ALLOWLIST = new Set(['/poems/random', '/openapi.json', '/docs']);

// Match `/v1/...` paths, stopping at ')' / ']' / whitespace so markdown link
// syntax `[GET /v1/x](url)` yields '/v1/x' from both the label and the url.
const V1_PATH_REGEX = /\/v1\/[^)\]\s]*/g;
const V1_PREFIX_REGEX = /^\/v1/;
const TRAILING_DOTS_REGEX = /[.]+$/;

// Extract `/v1/...` paths from the rendered llms.txt, stripping markdown link
// syntax, query strings, and the `/v1` prefix so they line up with spec.paths.
function llmsContractPaths(body: string): string[] {
  const matches = body.match(V1_PATH_REGEX) ?? [];
  const normalize = (m: string): string =>
    (m.split('?')[0] ?? m).replace(V1_PREFIX_REGEX, '').replace(TRAILING_DOTS_REGEX, '');
  return [...new Set(matches.map(normalize))];
}

describe('llms routes', () => {
  it('serves /llms.txt as plain text', async () => {
    const client = createTestClient(llms);

    const res = await client.$get('/llms.txt');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(CONTENT_TYPE_TEXT_REGEX);
    const text = await res.text();
    expect(text).toMatch(QAFIYAH_API_HEADER_REGEX);
    expect(text).toContain('https://api.qafiyah.com/v1');
  });

  it('lists only endpoints that exist in the OpenAPI contract (drift guard)', async () => {
    const txt = await (await app.fetch(new Request('http://x/llms.txt'), TEST_ENV)).text();
    const spec = (await (
      await app.fetch(new Request('http://x/v1/openapi.json'), TEST_ENV)
    ).json()) as { paths: Record<string, unknown> };
    const specPaths = new Set(Object.keys(spec.paths));
    const parentTemplate = (p: string) => `${p.split('/').slice(0, -1).join('/')}/{slug}`;

    const missing = llmsContractPaths(txt).filter(
      (p) => !(ALLOWLIST.has(p) || specPaths.has(p) || specPaths.has(parentTemplate(p)))
    );

    expect(missing).toEqual([]);
  });
});
