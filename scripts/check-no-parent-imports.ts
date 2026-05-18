#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(`${import.meta.dir}/..`);

const SCAN_ROOTS = ['apps', 'packages'];
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.astro'];
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.astro',
  '.turbo',
  '.next',
  '.wrangler',
]);

const importRe =
  /(?:^|[\s;])(?:import|export)(?:\s+[^'"`;]*?\s+from\s*)?\s*['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (SOURCE_EXTS.some((ext) => entry.endsWith(ext))) yield full;
  }
}

type Violation = { file: string; line: number; spec: string };

const violations: Violation[] = [];

for (const top of SCAN_ROOTS) {
  const dir = join(ROOT, top);
  for (const file of walk(dir)) {
    const content = readFileSync(file, 'utf8');
    for (const m of content.matchAll(importRe)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      if (!spec.startsWith('../')) continue;
      const line = content.slice(0, m.index ?? 0).split('\n').length;
      violations.push({ file: relative(ROOT, file), line, spec });
    }
  }
}

if (violations.length > 0) {
  console.error('Parent-relative imports detected:\n');
  for (const v of violations) console.error(`  ${v.file}:${v.line}  "${v.spec}"`);
  console.error(
    [
      '',
      'Rule: no "../" imports. Use sibling "./" imports or the "@/" alias in apps.',
      'For packages/*, flatten the directory so all imports stay sibling-only.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log('No parent-relative imports.');
