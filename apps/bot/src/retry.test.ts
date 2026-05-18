import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const operation = vi.fn().mockResolvedValue(ok('poem'));
    const result = await withRetry(operation, 'fetch');
    expect(result._unsafeUnwrap()).toBe('poem');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures until success', async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce(err({ kind: 'boom', retryable: true }))
      .mockResolvedValueOnce(err({ kind: 'boom', retryable: true }))
      .mockResolvedValue(ok('poem'));
    const result = await withRetry(operation, 'fetch');
    expect(result._unsafeUnwrap()).toBe('poem');
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('returns terminal error immediately without retrying when retryable is false', async () => {
    const operation = vi.fn().mockResolvedValue(err({ kind: 'stop', retryable: false }));
    const result = await withRetry(operation, 'fetch');
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('terminal');
    expect(error.attempts).toBe(1);
    expect(error.operationName).toBe('fetch');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('returns retry_exhausted after MAX_ATTEMPTS on retryable failures', async () => {
    const operation = vi.fn().mockResolvedValue(err({ kind: 'boom', retryable: true }));
    const result = await withRetry(operation, 'fetch');
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe('retry_exhausted');
    expect(error.attempts).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10_000);
});
