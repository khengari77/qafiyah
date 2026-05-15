import type { TwitterApi } from 'twitter-api-v2';
import { vi } from 'vitest';
import {
  type err,
  fetchFormattedPoem,
  getEnvVar,
  initializeTwitterClient,
  ok,
  postTweet,
  TerminalError,
  withRetry,
} from './lib';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import fetch from 'node-fetch';

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// getEnvVar
// ---------------------------------------------------------------------------
describe('getEnvVar', () => {
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  it('returns ok when env var is present', () => {
    process.env.TEST_VAR = 'value';
    expect(getEnvVar('TEST_VAR')).toEqual({ ok: true, value: 'value' });
  });

  it('returns err when env var is missing', () => {
    const result = getEnvVar('TEST_VAR');
    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error.message).toContain('TEST_VAR');
  });
});

// ---------------------------------------------------------------------------
// initializeTwitterClient
// ---------------------------------------------------------------------------
describe('initializeTwitterClient', () => {
  const REQUIRED_VARS = [
    'TWITTER_APP_KEY',
    'TWITTER_APP_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
  ] as const;

  beforeEach(() => {
    for (const v of REQUIRED_VARS) process.env[v] = 'test_value';
  });

  afterEach(() => {
    for (const v of REQUIRED_VARS) delete process.env[v];
  });

  it('returns ok when all four env vars are present', () => {
    const result = initializeTwitterClient();
    expect(result.ok).toBe(true);
  });

  it.each(REQUIRED_VARS)('returns err when %s is missing', (missing) => {
    delete process.env[missing];
    const result = initializeTwitterClient();
    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error.message).toContain(missing);
  });
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------
describe('withRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ok on first successful attempt', async () => {
    const op = vi.fn().mockResolvedValue('result');
    expect(await withRetry(op, 'test')).toEqual(ok('result'));
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('wraps a non-Error thrown value in an Error (rate limit path)', async () => {
    const op = vi.fn().mockRejectedValue('status 429 from server');
    const result = await withRetry(op, 'test');
    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error.message).toBe('Rate limit hit. Aborting.');
  });

  it('returns err immediately on TerminalError without retrying', async () => {
    const op = vi.fn().mockRejectedValue(new TerminalError('fatal'));
    const result = await withRetry(op, 'test');
    expect(result.ok).toBe(false);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('returns err immediately on 429 rate limit without retrying', async () => {
    const op = vi.fn().mockRejectedValue(new Error('status 429'));
    const result = await withRetry(op, 'test');
    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error.message).toContain('Rate limit');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('returns err immediately on "too many requests" without retrying', async () => {
    const op = vi.fn().mockRejectedValue(new Error('too many requests'));
    const result = await withRetry(op, 'test');
    expect(result.ok).toBe(false);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on a generic error and succeeds on 2nd attempt', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValueOnce('value');

    const promise = withRetry(op, 'test');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(ok('value'));
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('returns err after all 3 attempts fail', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(new Error('always fails'));

    const promise = withRetry(op, 'test');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error.message).toBe('always fails');
    expect(op).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// fetchFormattedPoem
// ---------------------------------------------------------------------------
describe('fetchFormattedPoem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns trimmed poem on successful API response', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '  قصيدة  ' });

    const promise = fetchFormattedPoem();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(ok('قصيدة'));
  });

  it('returns TerminalError when API returns empty body', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '   ' });

    const promise = fetchFormattedPoem();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error).toBeInstanceOf(TerminalError);
  });

  it('returns TerminalError when poem exceeds 280 chars', async () => {
    const longPoem = 'ب'.repeat(281);
    mockFetch.mockResolvedValue({ ok: true, text: async () => longPoem });

    const promise = fetchFormattedPoem();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect((result as ReturnType<typeof err>).error).toBeInstanceOf(TerminalError);
  });

  it('retries then fails when API always returns non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const promise = fetchFormattedPoem();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// postTweet
// ---------------------------------------------------------------------------
describe('postTweet', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns tweet id on successful post', async () => {
    const client = {
      v2: { tweet: vi.fn().mockResolvedValue({ data: { id: '12345' } }) },
    } as unknown as TwitterApi;

    const result = await postTweet(client, 'قصيدة');
    expect(result).toEqual(ok('12345'));
  });

  it('retries and fails when tweet response has no id', async () => {
    vi.useFakeTimers();
    const client = {
      v2: { tweet: vi.fn().mockResolvedValue({ data: {} }) },
    } as unknown as TwitterApi;

    const promise = postTweet(client, 'قصيدة');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(client.v2.tweet).toHaveBeenCalledTimes(3);
  });
});
