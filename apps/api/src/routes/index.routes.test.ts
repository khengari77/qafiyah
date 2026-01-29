/**
 * Tests for index routes
 */

import { describe, expect, it } from 'vitest';
import { createTestClient } from '../test-utils/test-helpers';
import index from './index.routes';

describe('index routes', () => {
  it('should return API reference text', async () => {
    const client = createTestClient(index);

    const res = await client.$get('/');

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Qafiyah API Reference');
    expect(text).toContain('GET /');
    expect(text).toContain('GET /eras');
    expect(text).toContain('GET /poems');
    expect(text).toContain('GET /poets');
  });
});
