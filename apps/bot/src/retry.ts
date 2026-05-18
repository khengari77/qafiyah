const MAX_ATTEMPTS = 3;
const INITIAL_DELAY_MS = 1_000;

export class TerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalError';
  }
}

export async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) console.log(`${operationName} succeeded on attempt ${attempt}`);
      return result;
    } catch (raw) {
      const error = raw instanceof Error ? raw : new Error(String(raw));
      if (error instanceof TerminalError) throw error;
      if (attempt === MAX_ATTEMPTS) throw error;
      const delay = INITIAL_DELAY_MS * 2 ** (attempt - 1);
      console.log(
        `${operationName}: Attempt ${attempt}/${MAX_ATTEMPTS} failed. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${operationName} failed unexpectedly`);
}
