#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(`${import.meta.dir}/..`);
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

const SCAN_DIRS = ['apps/web/src', 'apps/api/src', 'apps/bot/src'];

const TEST_FILE_RE = /\.(test|spec)\.[tj]sx?$/;

const isTestFile = (p: string): boolean =>
  TEST_FILE_RE.test(p) || p.endsWith('test-schemas.ts') || p.endsWith('test-utils.ts');

const RULES: ReadonlyArray<{ re: RegExp; name: string; constant: string }> = [
  {
    re: /qafiyah\.com/g,
    name: 'production domain',
    constant: 'PROD_DOMAIN / PROD_SITE_URL / PROD_API_URL',
  },
  { re: /localhost:4321\b/g, name: 'dev web URL', constant: 'DEV_WEB_PORT' },
  { re: /localhost:8787\b/g, name: 'dev API URL', constant: 'DEV_API_PORT' },
  { re: /\bport\s*[:=]\s*4321\b/g, name: 'dev web port', constant: 'DEV_WEB_PORT' },
  { re: /\bport\s*[:=]\s*8787\b/g, name: 'dev API port', constant: 'DEV_API_PORT' },
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (SOURCE_EXTS.some((ext) => entry.endsWith(ext))) yield full;
  }
}

type Violation = { file: string; line: number; match: string; name: string; constant: string };

const violations: Violation[] = [];

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  for (const file of walk(abs)) {
    if (isTestFile(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const rule of RULES) {
      for (const m of content.matchAll(rule.re)) {
        const line = content.slice(0, m.index ?? 0).split('\n').length;
        violations.push({
          file: relative(ROOT, file),
          line,
          match: m[0],
          name: rule.name,
          constant: rule.constant,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Hardcoded constants detected:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.match}", use ${v.constant} from @qafiyah/constants`);
  }
  console.error(
    [
      '',
      'Rule: brand strings, URLs, and dev ports live in packages/constants.',
      '      Import from @qafiyah/constants instead of hardcoding.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log('No hardcoded centralized constants found in app source.');
