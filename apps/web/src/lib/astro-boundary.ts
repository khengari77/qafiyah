import type { Result } from 'neverthrow';

/**
 * Build a consistently-formatted boundary error. The original payload is preserved via
 * `cause` so it appears in dev tooling and crash reports.
 */
export function boundaryError(operation: string, cause: unknown): Error {
  return new Error(`${operation} failed: ${JSON.stringify(cause)}`, { cause });
}

/**
 * Unwrap a Result at an Astro static-paths or page boundary. Astro has no native Result
 * integration, so a failure here aborts the build (for static paths) or the page render.
 * Use when the page has no way to recover from any error variant; for pages that redirect
 * on `not_found`, branch explicitly on `result.error.kind` and use {@link boundaryError}.
 */
export function unwrapForBoundary<T, E>(result: Result<T, E>, operation: string): T {
  if (result.isOk()) return result.value;
  throw boundaryError(operation, result.error);
}
