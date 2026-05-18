import { describe, expect, it, vi } from 'vitest';
import { TerminalError, withRetry } from './retry';

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const operation = vi.fn().mockResolvedValue('poem');
    await expect(withRetry(operation, 'fetch')).resolves.toBe('poem');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures until success', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('poem');
    await expect(withRetry(operation, 'fetch')).resolves.toBe('poem');
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('throws immediately on TerminalError without retrying', async () => {
    const operation = vi.fn().mockRejectedValue(new TerminalError('stop'));
    await expect(withRetry(operation, 'fetch')).rejects.toBeInstanceOf(TerminalError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting attempts on transient failure', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(operation, 'fetch')).rejects.toThrow('boom');
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10_000);
});
