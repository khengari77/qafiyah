import { err, ok, type Result } from 'neverthrow';

const MAX_ATTEMPTS = 3;
const INITIAL_DELAY_MS = 1_000;

export type Retryable = { readonly retryable: boolean };

export type RetryError<E> =
  | {
      readonly kind: 'terminal';
      readonly operationName: string;
      readonly attempts: number;
      readonly cause: E;
    }
  | {
      readonly kind: 'retry_exhausted';
      readonly operationName: string;
      readonly attempts: number;
      readonly cause: E;
    };

export async function withRetry<T, E extends Retryable>(
  operation: () => Promise<Result<T, E>>,
  operationName: string
): Promise<Result<T, RetryError<E>>> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await operation();
    if (result.isOk()) {
      if (attempt > 1) console.log(`${operationName} succeeded on attempt ${attempt}`);
      return ok(result.value);
    }
    if (!result.error.retryable) {
      return err({ kind: 'terminal', operationName, attempts: attempt, cause: result.error });
    }
    if (attempt === MAX_ATTEMPTS) {
      return err({
        kind: 'retry_exhausted',
        operationName,
        attempts: attempt,
        cause: result.error,
      });
    }
    const delay = INITIAL_DELAY_MS * 2 ** (attempt - 1);
    console.log(
      `${operationName}: Attempt ${attempt}/${MAX_ATTEMPTS} failed (${JSON.stringify(result.error)}). Retrying in ${delay}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(`withRetry(${operationName}): loop exited without returning`);
}
