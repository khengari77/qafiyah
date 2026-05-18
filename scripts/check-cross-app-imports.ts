#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(`${import.meta.dir}/..`);
const APPS = ['web', 'api', 'bot'] as const;
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.astro'];
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.astro',
  '.turbo',
  '.next',
  'build',
  'coverage',
]);

type App = (typeof APPS)[number];

const importRe =
  /(?:^|[\s;])(?:import|export)(?:\s+[^'"`;]*?\s+from\s*)?\s*['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walkFiles(full);
    else if (SOURCE_EXTS.some((ext) => entry.endsWith(ext))) yield full;
  }
}

function classifyCrossApp(spec: string, fromFile: string, ownApp: App): App | null {
  for (const otherApp of APPS) {
    if (otherApp === ownApp) continue;
    if (spec === `@qafiyah/${otherApp}` || spec.startsWith(`@qafiyah/${otherApp}/`))
      return otherApp;
  }
  if (spec.startsWith('.')) {
    const resolved = resolve(dirname(fromFile), spec);
    for (const otherApp of APPS) {
      if (otherApp === ownApp) continue;
      const siblingDir = join(ROOT, 'apps', otherApp);
      if (resolved === siblingDir || resolved.startsWith(`${siblingDir}/`)) return otherApp;
    }
  } else {
    for (const otherApp of APPS) {
      if (otherApp === ownApp) continue;
      if (spec.includes(`apps/${otherApp}/`) || spec.endsWith(`apps/${otherApp}`)) return otherApp;
    }
  }
  return null;
}

function scanSources(): string[] {
  const violations: string[] = [];
  for (const app of APPS) {
    const appDir = join(ROOT, 'apps', app);
    for (const file of walkFiles(appDir)) {
      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(importRe)) {
        const spec = match[1] ?? match[2];
        if (!spec) continue;
        const target = classifyCrossApp(spec, file, app);
        if (target) {
          violations.push(`${relative(ROOT, file)}: imports "${spec}" (apps/${target})`);
        }
      }
    }
  }
  return violations;
}

function scanPackageJson(): string[] {
  const violations: string[] = [];
  for (const app of APPS) {
    const pkgPath = join(ROOT, 'apps', app, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };
    for (const otherApp of APPS) {
      if (otherApp === app) continue;
      const name = `@qafiyah/${otherApp}`;
      if (deps[name]) {
        violations.push(`apps/${app}/package.json: declares dependency on ${name}`);
      }
    }
  }
  return violations;
}

const violations = [...scanPackageJson(), ...scanSources()];

if (violations.length > 0) {
  console.error('Cross-app imports detected:\n');
  for (const violation of violations) console.error(`  ${violation}`);
  console.error(
    '\nApps must not depend on sibling apps. Move shared code to packages/* or call across HTTP.'
  );
  process.exit(1);
}

console.log('No cross-app imports.');
