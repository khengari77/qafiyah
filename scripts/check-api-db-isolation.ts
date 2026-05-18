#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(`${import.meta.dir}/..`);
const API_SRC = join(ROOT, 'apps', 'api', 'src');
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.turbo']);

const FORBIDDEN = [
  { name: 'drizzle-orm', re: /^drizzle-orm(\/.*)?$/ },
  { name: 'postgres', re: /^postgres(\/.*)?$/ },
];

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

type Violation = { file: string; line: number; spec: string; pkg: string };

const violations: Violation[] = [];

for (const file of walk(API_SRC)) {
  const content = readFileSync(file, 'utf8');
  for (const m of content.matchAll(importRe)) {
    const spec = m[1] ?? m[2];
    if (!spec) continue;
    const hit = FORBIDDEN.find((f) => f.re.test(spec));
    if (!hit) continue;
    const line = content.slice(0, m.index ?? 0).split('\n').length;
    violations.push({ file: relative(ROOT, file), line, spec, pkg: hit.name });
  }
}

const pkgJsonPath = join(ROOT, 'apps', 'api', 'package.json');
const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
const declaredForbidden = FORBIDDEN.filter((f) => deps[f.name]).map((f) => f.name);

if (violations.length > 0 || declaredForbidden.length > 0) {
  console.error('apps/api DB-isolation violations:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  imports "${v.spec}" (${v.pkg})`);
  }
  for (const name of declaredForbidden) {
    console.error(`  apps/api/package.json declares dependency on ${name}`);
  }
  console.error(
    [
      '',
      'Rule: apps/api must access the DB exclusively through @qafiyah/db.',
      '      Direct drizzle-orm or postgres imports are forbidden here.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log('apps/api stays isolated from drizzle/postgres.');
