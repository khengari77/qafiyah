import { safe } from '@orpc/client';
import { errorStatus } from './api-error';

/**
 * Unwrap a successful oRPC response envelope (`{ data }`) or rethrow. Use for
 * list-all endpoints that have no "missing resource" case.
 */
export async function unwrap<D>(promise: Promise<{ data: D }>): Promise<D> {
  const { error, data } = await safe(promise);
  if (error) throw error;
  return data.data;
}

/**
 * Unwrap a successful oRPC response, mapping a 404 to `null` so the page can
 * render a /404. Any other error (500, transport failure) rethrows.
 *
 * The API serializes errors as RFC 9457 Problem+JSON, which the OpenAPILink
 * client exposes as a generic status-mapped ORPCError — so we key on the HTTP
 * status via {@link errorStatus}, not the contract error code.
 */
export async function getOrNull<D>(promise: Promise<{ data: D }>): Promise<D | null> {
  const { error, data } = await safe(promise);
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}
