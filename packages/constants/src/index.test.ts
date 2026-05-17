import { describe, expect, it } from 'vitest';
import { PROD_API_URL, PROD_DOMAIN } from './index';

const HTTPS_REGEX = /^https:\/\//;

describe('constants', () => {
  it('prod URLs use https and correct domain', () => {
    expect(PROD_API_URL).toMatch(HTTPS_REGEX);
    expect(PROD_API_URL).toContain(PROD_DOMAIN);
  });
});
