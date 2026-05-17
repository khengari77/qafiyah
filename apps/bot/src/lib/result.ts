export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: Error };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: Error): Result<T> {
  return { ok: false, error };
}

export class TerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalError';
  }
}
