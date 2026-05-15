import { describe, expect, it } from 'vitest';
import {
  DEV_API_PORT,
  DEV_API_URL,
  DEV_WEB_PORT,
  DEV_WEB_URL,
  PROD_API_URL,
  PROD_DOMAIN,
  PROD_SITE_URL,
} from './index';

describe('constants', () => {
  it('prod URLs use https and correct domain', () => {
    expect(PROD_SITE_URL).toMatch(/^https:\/\//);
    expect(PROD_API_URL).toMatch(/^https:\/\//);
    expect(PROD_SITE_URL).toContain(PROD_DOMAIN);
    expect(PROD_API_URL).toContain(PROD_DOMAIN);
  });

  it('dev URLs match their port constants', () => {
    expect(DEV_WEB_URL).toContain(String(DEV_WEB_PORT));
    expect(DEV_API_URL).toContain(String(DEV_API_PORT));
  });
});
