import { ORPCError } from '@orpc/client';
import { err, ok, type Result } from 'neverthrow';

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

export async function callApi<T>(
  endpoint: string,
  args: Readonly<Record<string, unknown>> | undefined,
  fn: () => Promise<T>
): Promise<Result<T, ApiFetchError>> {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof ORPCError) {
      if (e.code === 'NOT_FOUND') {
        return err({ kind: 'not_found', endpoint, ...(args && { args }) });
      }
      return err({
        kind: 'transport',
        endpoint,
        ...(args && { args }),
        cause: { message: e.message, code: e.code, status: e.status },
      });
    }
    const message = e instanceof Error ? e.message : String(e);
    return err({
      kind: 'transport',
      endpoint,
      ...(args && { args }),
      cause: { message },
    });
  }
}
