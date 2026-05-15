import { describe, expect, it } from 'vitest';
import { createTestClient } from '@/test-utils';
import llms from './llms.routes';

const CONTENT_TYPE_TEXT_REGEX = /^text\/plain/;
const QAFIYAH_API_HEADER_REGEX = /^# Qafiyah API/;

describe('llms routes', () => {
  it('serves /llms.txt as plain text', async () => {
    const client = createTestClient(llms);

    const res = await client.$get('/llms.txt');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(CONTENT_TYPE_TEXT_REGEX);
    const text = await res.text();
    expect(text).toMatch(QAFIYAH_API_HEADER_REGEX);
    expect(text).toContain('https://api.qafiyah.com/v1');
  });
});
