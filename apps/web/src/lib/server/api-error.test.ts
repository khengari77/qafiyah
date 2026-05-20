import { ORPCError } from '@orpc/client';
import { describe, expect, it } from 'vitest';
import { errorStatus } from './api-error';

describe('errorStatus', () => {
  it('returns the HTTP status of an ORPCError', () => {
    expect(errorStatus(new ORPCError('NOT_FOUND', { status: 404 }))).toBe(404);
    expect(errorStatus(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }))).toBe(500);
  });

  it('returns null for a non-ORPCError (transport failure)', () => {
    expect(errorStatus(new Error('network down'))).toBeNull();
    expect(errorStatus(undefined)).toBeNull();
  });
});
