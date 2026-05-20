import { describe, expect, it } from 'vitest';
import { resolveInternalApiUrl } from './env';

describe('resolveInternalApiUrl', () => {
  it('defaults to the local API dev server when unset', () => {
    expect(resolveInternalApiUrl(undefined)).toBe('http://localhost:8787');
  });

  it('returns a provided valid URL unchanged', () => {
    expect(resolveInternalApiUrl('http://api:8787')).toBe('http://api:8787');
  });

  it('throws on a non-URL value', () => {
    expect(() => resolveInternalApiUrl('not-a-url')).toThrow('INTERNAL_API_URL');
  });
});
