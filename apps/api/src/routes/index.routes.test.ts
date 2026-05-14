import { describe, expect, it } from 'vitest';
import { createTestClient } from '@/test-utils/test-helpers';
import index from './index.routes';

describe('index routes', () => {
  it('should redirect / to /v1/docs', async () => {
    const client = createTestClient(index);

    const res = await client.$get('/');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/v1/docs');
  });
});
