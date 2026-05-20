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
