import { ORPCError } from '@orpc/client';

/**
 * HTTP status of an oRPC client error, or null when it is not an ORPCError
 * (e.g. a transport failure where the API was unreachable).
 *
 * The API serializes errors as RFC 9457 Problem+JSON, which the OpenAPILink
 * client does NOT deserialize back into the contract's defined errors — it
 * exposes a generic status-mapped ORPCError (isDefined === false) instead. So
 * accessors key on the HTTP status, not isDefinedError / the contract error code.
 */
export function errorStatus(error: unknown): number | null {
  return error instanceof ORPCError ? error.status : null;
}
