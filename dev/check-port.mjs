import net from 'node:net';

const port = Number(process.argv[2]);
if (!port) {
  console.error('[predev] usage: check-port.mjs <port>');
  process.exit(2);
}

// Probe both address families — Astro typically binds [::1], wrangler typically binds 127.0.0.1.
// A test bind on the wrong family wouldn't collide with the real listener.
const hosts = ['127.0.0.1', '::1'];

function probe(host) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err) => resolve(err.code === 'EADDRINUSE' ? 'busy' : 'other'))
      .once('listening', () => tester.close(() => resolve('free')))
      .listen(port, host);
  });
}

const results = await Promise.all(hosts.map(probe));
if (results.includes('busy')) {
  console.error(`\n[predev] port ${port} is already in use.`);
  console.error('[predev] another dev server is probably still running.');
  console.error('[predev] run `pnpm clean:dev` to clear orphans, then try again.\n');
  process.exit(1);
}
