const POSITIVE_INTEGER_RE = /^\d+$/;

/**
 * Parses a route `[page]` param. Returns null for anything that is not a
 * positive integer so callers can render a 404.
 */
export function parsePageParam(raw: string | undefined): number | null {
  if (raw === undefined || !POSITIVE_INTEGER_RE.test(raw)) return null;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}

/**
 * Parses a `?page=N` query value. An absent param means the first page (the
 * bare resource URL). An explicit `page=1` is rejected so page 1 has exactly
 * one address. Anything that is not an integer >= 2 returns null (→ 404).
 */
export function parsePageQuery(raw: string | null): number | null {
  if (raw === null) return 1;
  if (!POSITIVE_INTEGER_RE.test(raw)) return null;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 2 ? page : null;
}
