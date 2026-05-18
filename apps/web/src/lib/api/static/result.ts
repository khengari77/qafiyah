import { ORPCError } from '@orpc/client';
import type { Result } from 'neverthrow';
import { ResultAsync } from 'neverthrow';

export type ApiFetchError =
  | {
      readonly kind: 'not_found';
      readonly endpoint: string;
      readonly args?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'transport';
      readonly endpoint: string;
      readonly args?: Readonly<Record<string, unknown>>;
      readonly cause: {
        readonly message: string;
        readonly code?: string;
        readonly status?: number;
      };
    };

function toApiFetchError(
  endpoint: string,
  args: Readonly<Record<string, unknown>> | undefined,
  cause: unknown
): ApiFetchError {
  if (cause instanceof ORPCError) {
    if (cause.code === 'NOT_FOUND') {
      return { kind: 'not_found', endpoint, ...(args && { args }) };
    }
    return {
      kind: 'transport',
      endpoint,
      ...(args && { args }),
      cause: { message: cause.message, code: cause.code, status: cause.status },
    };
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return {
    kind: 'transport',
    endpoint,
    ...(args && { args }),
    cause: { message },
  };
}

export async function callApi<T>(
  endpoint: string,
  args: Readonly<Record<string, unknown>> | undefined,
  fn: () => Promise<T>
): Promise<Result<T, ApiFetchError>> {
  return await ResultAsync.fromPromise(fn(), (cause) => toApiFetchError(endpoint, args, cause));
}
