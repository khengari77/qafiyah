#!/usr/bin/env bun

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(`${import.meta.dir}/..`);

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.astro',
  '.turbo',
  '.wrangler',
  '.next',
  '.husky',
  '.github',
  '.vscode',
  '.claude',
  'tmp',
  'dumps',
  'tools',
  'docs',
  'venv',
]);

const IGNORED_REL_PATHS = new Set(['apps/web/public']);

const IGNORED_FILES = new Set(['.DS_Store']);

const VALIDATED_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.astro',
  '.json',
  '.toml',
  '.yml',
  '.yaml',
  '.css',
  '.sh',
  '.conf',
]);

const ALLOWED_BASENAMES = new Set([
  'README.md',
  'LICENSE',
  'AGENTS.md',
  'CLAUDE.md',
  'TODO.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'MAINTAINERS_GUIDE.md',
  'Dockerfile',
]);

const SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BRACKET_RE = /^\[\.{0,3}[a-z0-9]+(?:-[a-z0-9]+)*\]$/;

const isValidSegment = (s: string): boolean => SEGMENT_RE.test(s) || BRACKET_RE.test(s);

function shouldValidateFile(name: string): boolean {
  if (IGNORED_FILES.has(name)) return false;
  if (ALLOWED_BASENAMES.has(name)) return true;
  if (name.startsWith('.')) return true;
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  return VALIDATED_EXTS.has(name.slice(dot));
}

function isValidFile(name: string): boolean {
  if (ALLOWED_BASENAMES.has(name)) return true;
  const stripped = name.startsWith('.') ? name.slice(1) : name;
  return stripped.split('.').every(isValidSegment);
}

const isValidDir = (name: string): boolean => isValidSegment(name);

type Violation = { kind: 'file' | 'dir'; path: string };

const violations: Violation[] = [];

function walk(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      if (IGNORED_REL_PATHS.has(rel)) continue;
      if (!isValidDir(entry)) violations.push({ kind: 'dir', path: rel });
      walk(full);
    } else {
      if (!shouldValidateFile(entry)) continue;
      if (!isValidFile(entry)) violations.push({ kind: 'file', path: rel });
    }
  }
}

walk(ROOT);

if (violations.length > 0) {
  console.error('Naming convention violations:\n');
  for (const v of violations) console.error(`  ${v.kind.padEnd(4)} ${v.path}`);
  console.error(
    [
      '',
      'Rule: every dot-separated segment of a name must be kebab-case',
      '      ([a-z0-9]+ joined by single hyphens).',
      'Allow-listed:',
      '  - Astro brackets, e.g. [slug], [page], [...rest]',
      '  - Numeric segments, e.g. 404.astro',
      `  - Docs/special files: ${[...ALLOWED_BASENAMES].join(', ')}`,
      '',
    ].join('\n')
  );
  process.exit(1);
}

console.log('All file and directory names conform.');
