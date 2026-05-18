#!/usr/bin/env bun

import type { Subprocess } from 'bun';

type Task = { name: string; cmd: string[] };

const ROOT = `${import.meta.dir}/..`;

const SEQUENTIAL: Task[] = [
  { name: 'format', cmd: ['bun', 'run', 'format'] },
  { name: 'lint', cmd: ['bun', 'run', 'lint'] },
];

const PARALLEL: Task[] = [
  { name: 'types', cmd: ['bun', 'run', 'types'] },
  { name: 'test', cmd: ['bun', 'run', 'test'] },
  { name: 'knip', cmd: ['bun', 'run', 'knip'] },
  { name: 'madge', cmd: ['bun', 'run', 'madge'] },
  { name: 'boundaries', cmd: ['bun', 'run', 'check:boundaries'] },
  { name: 'depcruise', cmd: ['bun', 'run', 'depcruise'] },
  { name: 'audit', cmd: ['bun', 'audit'] },
  { name: 'smoke', cmd: ['bun', 'run', 'smoke'] },
];

const fmtMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

type Result = { name: string; code: number; output: string; ms: number };

async function runSequential(tasks: Task[]): Promise<void> {
  for (const t of tasks) {
    const start = Date.now();
    process.stdout.write(`▶ ${t.name}... `);
    const proc = Bun.spawn(t.cmd, { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' });
    const code = await proc.exited;
    const ms = Date.now() - start;
    if (code !== 0) {
      console.error(`\n✗ ${t.name} failed (${fmtMs(ms)})`);
      process.exit(code || 1);
    }
    console.log(`✓ (${fmtMs(ms)})`);
  }
}

async function runOne(task: Task, procs: Map<string, Subprocess>): Promise<Result> {
  const start = Date.now();
  const proc = Bun.spawn(task.cmd, { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  procs.set(task.name, proc);
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  procs.delete(task.name);
  return {
    name: task.name,
    code,
    output: [stdout, stderr].filter(Boolean).join('\n').trimEnd(),
    ms: Date.now() - start,
  };
}

async function cleanupOrphans(): Promise<void> {
  await Bun.spawn(['bun', 'run', 'clean:dev'], {
    cwd: ROOT,
    stdout: 'ignore',
    stderr: 'ignore',
  }).exited;
}

async function runParallel(tasks: Task[]): Promise<void> {
  const procs = new Map<string, Subprocess>();
  const pending = new Map<Promise<Result>, Task>();
  for (const t of tasks) pending.set(runOne(t, procs), t);

  let failed: Result | null = null;

  while (pending.size > 0) {
    const winner = await Promise.race(
      [...pending.keys()].map((p) => p.then((res) => [p, res] as const))
    );
    pending.delete(winner[0]);
    const r = winner[1];
    if (r.code !== 0) {
      failed = r;
      for (const proc of procs.values()) proc.kill();
      break;
    }
    console.log(`✓ ${r.name} (${fmtMs(r.ms)})`);
  }

  if (failed) {
    await Promise.allSettled(pending.keys());
    await cleanupOrphans();
    console.error(`\n✗ ${failed.name} failed (${fmtMs(failed.ms)})`);
    if (failed.output) console.error(failed.output);
    process.exit(failed.code || 1);
  }
}

const totalStart = Date.now();
console.log('── sequential (file-mutating) ──');
await runSequential(SEQUENTIAL);
console.log('\n── parallel ──');
await runParallel(PARALLEL);
console.log(`\n✓ ci passed (${fmtMs(Date.now() - totalStart)})`);
