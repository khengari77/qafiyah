import { HTTP_NOT_MODIFIED } from '@/constants';

const FNV_OFFSET_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const MASK_64 = (1n << 64n) - 1n;
const WEAK_ETAG_PREFIX = /^W\//;

// 64-bit FNV-1a over UTF-16 code units. Pure, runtime-agnostic (no Bun.*), and
// wide enough that birthday collisions are negligible across the catalog — a
// 32-bit hash would risk a stale 304 once a few thousand distinct bodies exist.
function fnv1a64Hex(input: string): string {
  let hash = FNV_OFFSET_64;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}

function weakETag(body: string): string {
  return `W/"${fnv1a64Hex(body)}"`;
}

function ifNoneMatchSatisfied(headerValue: string | null, etag: string): boolean {
  if (!headerValue) return false;
  if (headerValue.trim() === '*') return true;
  const strongOf = (value: string) => value.trim().replace(WEAK_ETAG_PREFIX, '');
  const target = strongOf(etag);
  return headerValue.split(',').some((candidate) => strongOf(candidate) === target);
}

// @ANCHOR: the sole HTTP-caching boundary for /v1 reads — app.ts pipes every
//   matched, successful oRPC response through this. Errors and non-JSON pass
//   through untouched.
export async function withReadCaching(
  request: Request,
  response: Response,
  cacheControl: string
): Promise<Response> {
  if (response.status >= 400) return response;
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return response;

  const body = await response.clone().text();
  const etag = weakETag(body);

  if (ifNoneMatchSatisfied(request.headers.get('If-None-Match'), etag)) {
    const headers = new Headers({ ETag: etag, 'Cache-Control': cacheControl });
    const vary = response.headers.get('Vary');
    if (vary) headers.set('Vary', vary);
    return new Response(null, { status: HTTP_NOT_MODIFIED, headers });
  }

  const headers = new Headers(response.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', cacheControl);
  return new Response(body, { status: response.status, headers });
}
