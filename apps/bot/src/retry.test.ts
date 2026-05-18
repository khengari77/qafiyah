import { describe, expect, it, vi } from 'vitest';
import { TerminalError, withRetry } from './retry';

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const op = vi.fn().mockResolvedValue('poem');
    await expect(withRetry(op, 'fetch')).resolves.toBe('poem');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures until success', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('poem');
    await expect(withRetry(op, 'fetch')).resolves.toBe('poem');
    expect(op).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('throws immediately on TerminalError without retrying', async () => {
    const op = vi.fn().mockRejectedValue(new TerminalError('stop'));
    await expect(withRetry(op, 'fetch')).rejects.toBeInstanceOf(TerminalError);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting attempts on transient failure', async () => {
    const op = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(op, 'fetch')).rejects.toThrow('boom');
    expect(op).toHaveBeenCalledTimes(3);
  }, 10_000);
});
