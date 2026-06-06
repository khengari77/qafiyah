import { ORPCError } from '@orpc/client';
import { describe, expect, it } from 'vitest';
import { getOrNull, unwrap } from './unwrap';

describe('unwrap', () => {
  it('returns the inner data on success', async () => {
    expect(await unwrap(Promise.resolve({ data: [1, 2, 3] }))).toEqual([1, 2, 3]);
  });

  it('rethrows any error', async () => {
    await expect(
      unwrap(Promise.reject(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 })))
    ).rejects.toThrow();
  });
});

describe('getOrNull', () => {
  it('returns the inner data on success', async () => {
    expect(await getOrNull(Promise.resolve({ data: { name: 'x' } }))).toEqual({ name: 'x' });
  });

  it('returns null on NOT_FOUND', async () => {
    expect(
      await getOrNull(Promise.reject(new ORPCError('NOT_FOUND', { defined: true, status: 404 })))
    ).toBeNull();
  });

  it('rethrows on a 500 (a genuine server error is not a missing resource)', async () => {
    await expect(
      getOrNull(Promise.reject(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 })))
    ).rejects.toThrow();
  });

  it('rethrows unexpected (non-ORPCError) errors', async () => {
    await expect(getOrNull(Promise.reject(new Error('network down')))).rejects.toThrow(
      'network down'
    );
  });
});
