#!/usr/bin/env bun

import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';

const BASE = 'http://localhost:4321';

const URLS = [
  `${BASE}/`,
  `${BASE}/poets/page/1`,
  `${BASE}/poets/amna-bnt-otaiba/page/1`,
  `${BASE}/eras`,
  `${BASE}/eras/jahili/page/1`,
  `${BASE}/meters`,
  `${BASE}/meters/albasit/page/1`,
  `${BASE}/rhymes/b7241a08-64be-45ae-ae44-484f211980b3/page/1`,
  `${BASE}/themes`,
  `${BASE}/themes/39c7975b-86b0-46a7-9426-c03de72faf03/page/1`,
  `${BASE}/poems/3f946247-47a1-4ccd-b08c-2419ee729e2a`,
  `${BASE}/?q=%D9%8A%D8%A7+%D8%B1%D8%A8`,
  `${BASE}/?q=%D9%8A%D8%A7+%D8%B1%D8%A8&match_type=exact&rhyme_ids=15`,
  `${BASE}/?era_ids=4&meter_ids=24`,
  `${BASE}/?search_type=poets&q=%D8%A7%D9%84%D9%85%D8%AA%D9%86%D8%A8%D9%8A&match_type=any`,
];

const STARTUP_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 250;
const POLL_FETCH_MS = 500;
const ROOT_URL = `${BASE}/`;
const ROOT = `${import.meta.dir}/..`;

const uniqueUrls = [...new Set(URLS)];

type FetchError = {
  readonly kind: 'network' | 'timeout';
  readonly message: string;
};

async function tryFetch(url: string, timeoutMs: number): Promise<Result<Response, FetchError>> {
  return await ResultAsync.fromPromise(
    fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
    (cause): FetchError => {
      const isAbort = cause instanceof DOMException && cause.name === 'AbortError';
      return {
        kind: isAbort ? 'timeout' : 'network',
        message: cause instanceof Error ? cause.message : String(cause),
      };
    }
  );
}

type ServerReady = { readonly kind: 'ready' };
type ServerUnready = { readonly kind: 'timeout'; readonly lastError: FetchError | null };

async function waitForServer(): Promise<Result<ServerReady, ServerUnready>> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError: FetchError | null = null;
  while (Date.now() < deadline) {
    const fetchResult = await tryFetch(ROOT_URL, POLL_FETCH_MS);
    if (fetchResult.isOk()) {
      if (fetchResult.value.status < 500) return ok({ kind: 'ready' });
      lastError = { kind: 'network', message: `HTTP ${fetchResult.value.status}` };
    } else {
      lastError = fetchResult.error;
    }
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  return err({ kind: 'timeout', lastError });
}

type CheckSuccess = { readonly url: string; readonly status: number };
type CheckFailure =
  | { readonly url: string; readonly reason: 'http_error'; readonly status: number }
  | { readonly url: string; readonly reason: 'fetch_failed'; readonly cause: FetchError };

async function checkUrl(url: string): Promise<Result<CheckSuccess, CheckFailure>> {
  const fetchResult = await tryFetch(url, REQUEST_TIMEOUT_MS);
  if (fetchResult.isErr()) {
    return err({ url, reason: 'fetch_failed', cause: fetchResult.error });
  }
  const status = fetchResult.value.status;
  if (status !== 200) {
    return err({ url, reason: 'http_error', status });
  }
  return ok({ url, status });
}

function describeCheckFailure(failure: CheckFailure): string {
  return match(failure)
    .with({ reason: 'http_error' }, ({ status }) => `HTTP ${status}`)
    .with({ reason: 'fetch_failed' }, ({ cause }) => `${cause.kind}: ${cause.message}`)
    .exhaustive();
}

async function cleanup() {
  await Bun.spawn(['bun', 'run', 'clean:dev'], { cwd: ROOT, stdout: 'ignore', stderr: 'ignore' })
    .exited;
}

async function main() {
  const dev = Bun.spawn(['bun', 'run', 'dev'], {
    cwd: ROOT,
    stdout: Bun.file('/tmp/dev-server.log'),
    stderr: Bun.file('/tmp/dev-server.log'),
  });

  process.stdout.write('Started smoking...');
  const readiness = await waitForServer();
  if (readiness.isErr()) {
    const tail = readiness.error.lastError
      ? ` last error: ${readiness.error.lastError.kind} — ${readiness.error.lastError.message}.`
      : '';
    console.error(` server never came up (see /tmp/dev-server.log).${tail}`);
    dev.kill();
    await cleanup();
    process.exit(1);
  }
  process.stdout.write(' running...\n');

  for (const url of uniqueUrls) {
    const result = await checkUrl(url);
    if (result.isErr()) {
      console.error(`FAIL  ${result.error.url}  →  ${describeCheckFailure(result.error)}`);
      dev.kill();
      await cleanup();
      process.exit(1);
    }
    console.log(`OK    ${url}`);
  }

  dev.kill();
  await cleanup();

  console.log(`${uniqueUrls.length}/${uniqueUrls.length} passed`);
}

await main();
