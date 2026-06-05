import { describe, expect, it } from 'vitest';
import { parsePageParam, parsePageQuery } from './page-numbers';

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

describe('parsePageQuery', () => {
  it('treats an absent param as the first page', () => {
    expect(parsePageQuery(null)).toBe(1);
  });
  it('parses a page beyond the first', () => {
    expect(parsePageQuery('2')).toBe(2);
    expect(parsePageQuery('42')).toBe(42);
  });
  it('rejects an explicit page=1 since the first page is the bare URL', () => {
    expect(parsePageQuery('1')).toBeNull();
  });
  it('returns null for non-numeric, zero, negative, or decimal', () => {
    expect(parsePageQuery('abc')).toBeNull();
    expect(parsePageQuery('0')).toBeNull();
    expect(parsePageQuery('-3')).toBeNull();
    expect(parsePageQuery('2.5')).toBeNull();
  });
});
