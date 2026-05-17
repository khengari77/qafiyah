#!/usr/bin/env bun
// Warns (non-blocking) when the qafiyah Postgres container isn't reachable.
import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 5433;

function isReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.connect(PORT, HOST, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

if (!(await isReachable())) {
  console.warn(`\n[predev] warn: Postgres is not reachable on ${HOST}:${PORT}.`);
  console.warn('[predev] warn: the qafiyah Docker container may not be running.');
  console.warn('[predev] warn: run `bun run db:setup` to start it.\n');
}
