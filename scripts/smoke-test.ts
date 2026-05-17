#!/usr/bin/env bun

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
const REQUEST_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 250;
const POLL_FETCH_MS = 500;
const ROOT_URL = `${BASE}/`;
const ROOT = `${import.meta.dir}/..`;

const uniqueUrls = [...new Set(URLS)];

async function waitForServer(): Promise<boolean> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(ROOT_URL, { signal: AbortSignal.timeout(POLL_FETCH_MS) });
      if (res.status < 500) return true;
    } catch {
      /* keep polling */
    }
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  return false;
}

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    return { url, ok: res.status === 200, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { url, ok: false, detail: String(err) };
  }
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
  const ready = await waitForServer();
  if (!ready) {
    console.error(' server never came up (see /tmp/dev-server.log)');
    dev.kill();
    await cleanup();
    process.exit(1);
  }
  process.stdout.write(' running...\n');

  for (const url of uniqueUrls) {
    const result = await checkUrl(url);
    if (!result.ok) {
      console.error(`FAIL  ${result.url}  →  ${result.detail}`);
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
