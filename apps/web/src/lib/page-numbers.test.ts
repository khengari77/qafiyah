import { describe, expect, it } from 'vitest';
import { parsePageParam } from './page-numbers';

describe('parsePageParam', () => {
  it('parses a positive integer string', () => {
    expect(parsePageParam('1')).toBe(1);
    expect(parsePageParam('42')).toBe(42);
  });
  it('returns null for undefined, non-numeric, zero, negative, or decimal', () => {
    expect(parsePageParam(undefined)).toBeNull();
    expect(parsePageParam('abc')).toBeNull();
    expect(parsePageParam('0')).toBeNull();
    expect(parsePageParam('-3')).toBeNull();
    expect(parsePageParam('1.5')).toBeNull();
  });
});
