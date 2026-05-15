import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('twitter-api-v2', () => ({
  TwitterApi: vi.fn(),
}));

import fetch from 'node-fetch';
import { TwitterApi } from 'twitter-api-v2';
import { run } from './lib';

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
const MockTwitterApi = TwitterApi as unknown as ReturnType<typeof vi.fn>;

class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

async function runExpectingExit(): Promise<ExitError> {
  try {
    await run();
    throw new Error('run() did not call process.exit');
  } catch (e) {
    if (e instanceof ExitError) return e;
    throw e;
  }
}

describe('run()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    MockTwitterApi.mockReset();
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new ExitError(typeof code === 'number' ? code : 0);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exits with 1 when TwitterApi constructor throws an Error', async () => {
    MockTwitterApi.mockImplementation(
      class {
        constructor() {
          throw new Error('Twitter init failed');
        }
      }
    );
    const e = await runExpectingExit();
    expect(e.code).toBe(1);
  });

  it('exits with 1 when TwitterApi constructor throws a non-Error', async () => {
    MockTwitterApi.mockImplementation(
      class {
        constructor() {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error';
        }
      }
    );
    const e = await runExpectingExit();
    expect(e.code).toBe(1);
  });

  it('exits with 1 when fetchFormattedPoem fails', async () => {
    const tweetFn = vi.fn();
    MockTwitterApi.mockImplementation(
      class {
        v2 = { tweet: tweetFn };
      }
    );
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const promise = runExpectingExit();
    await vi.runAllTimersAsync();
    const e = await promise;
    expect(e.code).toBe(1);
  });

  it('exits with 1 when postTweet fails', async () => {
    const tweetMock = vi.fn().mockResolvedValue({ data: {} });
    MockTwitterApi.mockImplementation(
      class {
        v2 = { tweet: tweetMock };
      }
    );
    mockFetch.mockResolvedValue({ ok: true, text: async () => 'قصيدة' });

    const promise = runExpectingExit();
    await vi.runAllTimersAsync();
    const e = await promise;
    expect(e.code).toBe(1);
  });

  it('exits with 0 on full success', async () => {
    vi.useRealTimers();
    const tweetMock = vi.fn().mockResolvedValue({ data: { id: '99999' } });
    MockTwitterApi.mockImplementation(
      class {
        v2 = { tweet: tweetMock };
      }
    );
    mockFetch.mockResolvedValue({ ok: true, text: async () => 'قصيدة' });

    const e = await runExpectingExit();
    expect(e.code).toBe(0);
  });
});
