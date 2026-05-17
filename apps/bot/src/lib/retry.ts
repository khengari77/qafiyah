import { HTTP_RATE_LIMIT_STATUS, HTTP_RATE_LIMIT_TEXT, INITIAL_RETRY_DELAY_MS, MAX_RETRY_ATTEMPTS } from '../constants';
import { err, ok, type Result, TerminalError } from './result';

type RetryClassification = 'terminal' | 'rate-limit' | 'transient';

function classifyRetry(error: Error): RetryClassification {
  if (error instanceof TerminalError) return 'terminal';
  const message = error.message.toLowerCase();
  if (message.includes(HTTP_RATE_LIMIT_STATUS) || message.includes(HTTP_RATE_LIMIT_TEXT)) return 'rate-limit';
  return 'transient';
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<Result<T>> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`${operationName} succeeded on attempt ${attempt}`);
      }
      return ok(result);
    } catch (raw) {
      const error = raw instanceof Error ? raw : new Error(String(raw));
      const kind = classifyRetry(error);

      if (kind === 'terminal') {
        console.log(`${operationName}: Terminal error, ${error.message}`);
        return err(error);
      }
      if (kind === 'rate-limit') {
        console.log(`${operationName}: Rate limited`);
        return err(new Error('Rate limit hit. Aborting.'));
      }
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
        console.log(
          `${operationName}: Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.log(`${operationName}: All ${MAX_RETRY_ATTEMPTS} attempts failed`);
        return err(error);
      }
    }
  }
  return err(new Error(`${operationName} failed unexpectedly`));
}
