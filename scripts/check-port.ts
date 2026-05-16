#!/usr/bin/env bun
const port = Number(Bun.argv[2]);
if (!port) {
  console.error('[predev] usage: check-port.ts <port>');
  process.exit(2);
}

function probe(host: string): 'busy' | 'free' {
  try {
    Bun.listen({ hostname: host, port, socket: {} }).stop(true);
    return 'free';
  } catch (err) {
    const isBusy =
      err instanceof Error && 'code' in err && (err as { code?: string }).code === 'EADDRINUSE';
    return isBusy ? 'busy' : 'free';
  }
}

if (['127.0.0.1', '::1'].some((host) => probe(host) === 'busy')) {
  console.error(`\n[predev] port ${port} is already in use.`);
  console.error('[predev] another dev server is probably still running.');
  console.error('[predev] run `bun run clean:dev` to clear orphans, then try again.\n');
  process.exit(1);
}
