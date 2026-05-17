#!/usr/bin/env bun

const URLS = [
  'http://localhost:4321/',
  'http://localhost:4321/poets/page/1',
  'http://localhost:4321/poets/amna-bnt-otaiba/page/1',
  'http://localhost:4321/eras',
  'http://localhost:4321/eras/jahili/page/1',
  'http://localhost:4321/meters',
  'http://localhost:4321/meters/albasit/page/1',
  'http://localhost:4321/rhymes/b7241a08-64be-45ae-ae44-484f211980b3/page/1',
  'http://localhost:4321/themes',
  'http://localhost:4321/themes/39c7975b-86b0-46a7-9426-c03de72faf03/page/1',
  'http://localhost:4321/poems/3f946247-47a1-4ccd-b08c-2419ee729e2a',
  'http://localhost:4321/?q=%D9%8A%D8%A7+%D8%B1%D8%A8',
  'http://localhost:4321/?q=%D9%8A%D8%A7+%D8%B1%D8%A8&match_type=exact&rhyme_ids=15',
  'http://localhost:4321/?era_ids=4&meter_ids=24',
  'http://localhost:4321/?search_type=poets&q=%D8%A7%D9%84%D9%85%D8%AA%D9%86%D8%A8%D9%8A&match_type=any',
] as const;

const STARTUP_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 250;
const POLL_FETCH_MS = 500;
const ROOT_URL = 'http://localhost:4321/';
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

  const results = await Promise.all(uniqueUrls.map(checkUrl));

  dev.kill();
  await cleanup();

  const failures = results.filter((r) => !r.ok);
  for (const r of failures) {
    console.error(`FAIL  ${r.url}  →  ${r.detail}`);
  }

  const { length: total } = results;
  const passed = total - failures.length;
  console.log(
    `${passed}/${total} passed${failures.length > 0 ? ` — ${failures.length} failed` : ''}`
  );

  if (failures.length > 0) process.exit(1);
}

await main();
