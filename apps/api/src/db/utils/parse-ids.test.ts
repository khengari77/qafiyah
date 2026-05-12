import { describe, expect, it } from 'vitest';
import { parseIds } from './parse-ids';

describe('parseIds', () => {
  it('converts comma-separated IDs to Postgres array syntax', () => {
    expect(parseIds('1,2,3')).toBe('{1,2,3}');
  });

  it('handles a single ID', () => {
    expect(parseIds('5')).toBe('{5}');
  });

  it('returns null for undefined input', () => {
    expect(parseIds(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseIds('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseIds('   ')).toBeNull();
  });

  it('skips non-numeric values', () => {
    expect(parseIds('abc,def')).toBeNull();
  });

  it('keeps valid IDs and drops non-numeric from mixed input', () => {
    expect(parseIds('1,abc,3')).toBe('{1,3}');
  });

  it('trims whitespace around each ID', () => {
    expect(parseIds(' 1 , 2 , 3 ')).toBe('{1,2,3}');
  });

  it('returns null when all values are non-numeric after parsing', () => {
    expect(parseIds('x,y,z')).toBeNull();
  });
});
