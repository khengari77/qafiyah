import { describe, expect, it } from 'vitest';
import {
  DEV_ELASTICSEARCH_PORT,
  POEMS_INDEX_ALIAS,
  POETS_INDEX_ALIAS,
  PROD_API_URL,
  PROD_DOMAIN,
} from './index';

const HTTPS_REGEX = /^https:\/\//;

describe('constants', () => {
  it('prod URLs use https and correct domain', () => {
    expect(PROD_API_URL).toMatch(HTTPS_REGEX);
    expect(PROD_API_URL).toContain(PROD_DOMAIN);
  });

  it('exposes elasticsearch aliases and dev port', () => {
    expect(POEMS_INDEX_ALIAS).toBe('poems');
    expect(POETS_INDEX_ALIAS).toBe('poets');
    expect(DEV_ELASTICSEARCH_PORT).toBe(9200);
  });
});
