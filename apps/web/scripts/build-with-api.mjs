#!/usr/bin/env node
// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress to the developer.

/**
 * Supervisor script for `astro build`.
 * Auto-starts the local API (wrangler dev) on port 8787 if it's not already running,
 * waits for the port to accept connections, then runs `astro build` with
 * BUILD_API_URL injected so apps/web/src/lib/api/static.ts hits the local API.
 *
 * BUILD_API_URL is a server-only env var (no PUBLIC_ prefix) so it never leaks
 * into the browser bundle, PUBLIC_API_URL stays pointed at the production API.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8787;
const HOST = '127.0.0.1';
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 200;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webDir, '..', '..');

function probePort(port, host) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host }, () => {
      sock.end();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
  });
}

async function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probePort(port, host)) return;
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
  }
  throw new Error(
    `[build-with-api] API failed to listen on ${host}:${port} within ${timeoutMs}ms.\n` +
      `Hints:\n` +
      `  - Did 'bun db:setup' succeed?\n` +
      `  - Is DATABASE_URL set in apps/api/.dev.vars?\n` +
      `  - Try running 'bun --filter @qafiyah/api dev' manually to see errors.`
  );
}

async function main() {
  const alreadyUp = await probePort(PORT, HOST);
  let api = null;

  if (alreadyUp) {
    console.log('[build-with-api] API already running on port', PORT, '— reusing.');
  } else {
    console.log('[build-with-api] Starting wrangler dev for @qafiyah/api...');
    api = spawn('bun', ['--filter', '@qafiyah/api', 'run', 'dev'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
    api.on('exit', (code, signal) => {
      if (code !== null && code !== 0 && signal !== 'SIGTERM') {
        console.error(`[build-with-api] API exited with code ${code}`);
        process.exit(code);
      }
    });
    await waitForPort(PORT, HOST, READY_TIMEOUT_MS);
    console.log('[build-with-api] API is ready, starting astro build...');
  }

  const buildEnv = {
    ...process.env,
    BUILD_API_URL: `http://${HOST}:${PORT}`,
  };

  const build = spawn('astro', ['build'], {
    cwd: webDir,
    stdio: 'inherit',
    env: buildEnv,
  });

  const exitCode = await new Promise((resolve) => {
    build.on('exit', (code) => resolve(code ?? 1));
  });

  if (api) {
    api.kill('SIGTERM');
    // Give it a moment to exit cleanly
    await new Promise((r) => setTimeout(r, 500));
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
