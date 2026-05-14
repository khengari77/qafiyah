import { describe, expect, it } from 'vitest';
import { createTestClient } from '@/test-utils/test-helpers';
import llms from './llms.routes';

describe('llms routes', () => {
  it('serves /llms.txt as plain text', async () => {
    const client = createTestClient(llms);

    const res = await client.$get('/llms.txt');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/^text\/plain/);
    const text = await res.text();
    expect(text).toMatch(/^# Qafiyah API/);
    expect(text).toContain('https://api.qafiyah.com/v1');
  });
});
