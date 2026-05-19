import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { err, ok, type Result } from 'neverthrow';

/**
 * Returns [] when totalCount === 0 so no static params are generated for entities with zero poems.
 */
export function generatePageNumbers(
  totalCount: number,
  perPage: number = POEMS_PER_PAGE
): readonly number[] {
  if (totalCount === 0) return [];

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

export type ParsePageParamError = { readonly kind: 'invalid_page'; readonly raw: string };

/**
 * Parse a route page parameter (e.g. Astro.params.page) into a positive integer. Returns
 * an error result for missing, non-numeric, or out-of-range values; callers typically
 * redirect to /404 on failure.
 */
export function parsePageParam(raw: string | undefined): Result<number, ParsePageParamError> {
  const rawString = raw ?? '';
  const parsed = Number.parseInt(rawString, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return err({ kind: 'invalid_page', raw: rawString });
  }
  return ok(parsed);
}
