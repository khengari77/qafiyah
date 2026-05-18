#!/usr/bin/env bun

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = resolve(`${import.meta.dir}/..`);

const helpText = `doctor, audit and upgrade workspace dependencies

Usage:
  bun scripts/deps-doctor.ts [options]

Options:
  --write            Apply updates via \`bun update --latest --recursive\`
  -i, --interactive  Use Bun's interactive TUI to pick per-package (implies --write)
  --fix-drift        Rewrite package.json specs to normalize drifting deps
  --verify           After mutations, run \`bun run types\` then \`bun run test\`
  --skip-drift       Skip the cross-workspace drift report
  -h, --help         Show help

Examples:
  bun run deps:doctor                       # diagnose only (read-only)
  bun run deps:doctor --write               # bump everything to latest stable
  bun run deps:doctor --fix-drift           # normalize spec strings, no version bumps
  bun run deps:doctor --write --fix-drift   # bump + normalize specs
  bun run deps:doctor --write --verify      # bump, then types + test
`;

// ──────────────────────────── types ────────────────────────────

type Kind = 'dep' | 'dev';
type Spec = {
  readonly workspace: string;
  readonly dir: string;
  readonly spec: string;
  readonly kind: Kind;
};
type Inventory = Map<string, Spec[]>;

type Pkg = {
  readonly workspace: string;
  readonly dir: string;
  readonly deps: Record<string, string>;
  readonly devDeps: Record<string, string>;
};

type Drift = { name: string; occurrences: Spec[]; canonical: string };

type OutdatedRow = {
  name: string;
  current: string;
  update: string;
  latest: string;
  workspace: string;
  gated: boolean; // held by --minimum-release-age
};

// ──────────────────────────── pkg discovery ────────────────────────────

function readPkg(dir: string, workspace: string): Pkg | null {
  let raw: string;
  try {
    raw = readFileSync(join(dir, 'package.json'), 'utf8');
  } catch {
    return null;
  }
  const json = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return {
    workspace,
    dir,
    deps: json.dependencies ?? {},
    devDeps: json.devDependencies ?? {},
  };
}

function findWorkspacePkgs(): Pkg[] {
  const out: Pkg[] = [];
  const root = readPkg(ROOT, 'root');
  if (root) out.push(root);
  for (const parent of ['apps', 'packages'] as const) {
    const parentDir = join(ROOT, parent);
    let entries: string[];
    try {
      entries = readdirSync(parentDir);
    } catch {
      continue;
    }
    for (const child of entries) {
      const childDir = join(parentDir, child);
      const pkg = readPkg(childDir, `${parent}/${child}`);
      if (pkg) out.push(pkg);
    }
  }
  return out;
}

const isWorkspaceRef = (spec: string): boolean => spec.startsWith('workspace:');

function buildInventory(pkgs: readonly Pkg[]): Inventory {
  const inv: Inventory = new Map();
  const record = (name: string, entry: Spec): void => {
    const list = inv.get(name) ?? [];
    list.push(entry);
    inv.set(name, list);
  };
  for (const pkg of pkgs) {
    for (const [name, spec] of Object.entries(pkg.deps)) {
      if (isWorkspaceRef(spec)) continue;
      record(name, { workspace: pkg.workspace, dir: pkg.dir, spec, kind: 'dep' });
    }
    for (const [name, spec] of Object.entries(pkg.devDeps)) {
      if (isWorkspaceRef(spec)) continue;
      record(name, { workspace: pkg.workspace, dir: pkg.dir, spec, kind: 'dev' });
    }
  }
  return inv;
}

function reportInventory(inv: Inventory, workspaceCount: number): void {
  let occurrences = 0;
  for (const list of inv.values()) occurrences += list.length;
  console.log(
    `  ${workspaceCount} workspace(s), ${inv.size} unique external dep(s), ${occurrences} total occurrence(s)`
  );
}

function reportOverrides(): void {
  const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    overrides?: Record<string, string>;
  };
  if (!root.overrides || Object.keys(root.overrides).length === 0) return;
  console.log('  overrides (preserved as-is):');
  for (const [name, spec] of Object.entries(root.overrides)) {
    console.log(`    ${name.padEnd(28)} ${spec}`);
  }
}

const VERSION_PREFIX_RE = /^([\^~]?)(.*)$/;
const TRAILING_STAR_RE = /\s*\*$/;

// ──────────────────────────── drift ────────────────────────────

// Pick the spec with the highest version. Prefix (`^`, `~`, or none) follows
// the majority across occurrences, with `^` as tie-breaker.
//   ['6.0.3', '^6', '^6.0.3', '^6']  →  '^6.0.3'
//   ['^4.1.5', '^4.1.5', '^4.1.6']   →  '^4.1.6'
function pickCanonical(occurrences: readonly Spec[]): string {
  const parse = (s: string | undefined): { prefix: string; raw: string; version: number[] } => {
    const m = (s ?? '').match(VERSION_PREFIX_RE);
    const prefix = m?.[1] ?? '';
    const raw = m?.[2] ?? '0';
    const version = raw.split('.').map((p) => Number.parseInt(p, 10) || 0);
    while (version.length < 3) version.push(0);
    return { prefix, raw, version };
  };
  const cmp = (a: number[], b: number[]): number => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = (a[i] ?? 0) - (b[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  };

  let bestRaw = parse(occurrences[0]?.spec).raw;
  let bestVer = parse(occurrences[0]?.spec).version;
  for (const o of occurrences.slice(1)) {
    const p = parse(o.spec);
    if (cmp(p.version, bestVer) > 0) {
      bestVer = p.version;
      bestRaw = p.raw;
    }
  }

  const prefixCounts = new Map<string, number>();
  for (const o of occurrences) {
    const p = parse(o.spec).prefix;
    prefixCounts.set(p, (prefixCounts.get(p) ?? 0) + 1);
  }
  let prefix = '^';
  let maxCount = -1;
  for (const [p, count] of prefixCounts) {
    if (count > maxCount || (count === maxCount && p === '^')) {
      prefix = p;
      maxCount = count;
    }
  }
  return `${prefix}${bestRaw}`;
}

function findDrift(inv: Inventory): Drift[] {
  const drift: Drift[] = [];
  for (const [name, occurrences] of inv) {
    const specs = new Set(occurrences.map((o) => o.spec));
    if (specs.size <= 1) continue;
    drift.push({ name, occurrences, canonical: pickCanonical(occurrences) });
  }
  return drift;
}

function reportDrift(entries: readonly Drift[]): void {
  if (entries.length === 0) {
    console.log('  no drift, all shared deps pin identical specs');
    return;
  }
  for (const { name, occurrences, canonical } of entries) {
    console.log(`  ${name}  →  canonical: ${canonical}`);
    for (const o of occurrences) {
      const marker = o.spec === canonical ? ' ' : '·';
      console.log(`    ${marker} ${o.workspace.padEnd(28)} ${o.spec}  (${o.kind})`);
    }
  }
  console.log(`\n  ${entries.length} dep(s) with mismatched specs across workspaces`);
}

function fixDrift(entries: readonly Drift[]): number {
  type Entry = { raw: string; json: Record<string, unknown>; touched: boolean };
  const pkgs = new Map<string, Entry>();
  const load = (dir: string): Entry => {
    let entry = pkgs.get(dir);
    if (!entry) {
      const raw = readFileSync(join(dir, 'package.json'), 'utf8');
      entry = { raw, json: JSON.parse(raw) as Record<string, unknown>, touched: false };
      pkgs.set(dir, entry);
    }
    return entry;
  };

  for (const { name, occurrences, canonical } of entries) {
    for (const o of occurrences) {
      if (o.spec === canonical) continue;
      const entry = load(o.dir);
      const field = o.kind === 'dep' ? 'dependencies' : 'devDependencies';
      const bucket = entry.json[field] as Record<string, string> | undefined;
      if (!bucket || bucket[name] !== o.spec) continue;
      bucket[name] = canonical;
      entry.touched = true;
      console.log(`  ${o.workspace}/${field}: ${name}  ${o.spec} → ${canonical}`);
    }
  }

  let changed = 0;
  for (const [dir, entry] of pkgs) {
    if (!entry.touched) continue;
    const trailing = entry.raw.endsWith('\n') ? '\n' : '';
    writeFileSync(join(dir, 'package.json'), `${JSON.stringify(entry.json, null, 2)}${trailing}`);
    changed += 1;
  }
  return changed;
}

// ──────────────────────────── bun outdated/update ────────────────────────────

// Bun's `outdated` draws box rows with U+2502 `│`. Parse them properly so we
// can distinguish real outdated packages from ones held by minimum-release-age
// (those rows show ` *` after the Update/Latest versions).
function parseOutdatedRows(text: string): OutdatedRow[] {
  const rows: OutdatedRow[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('│')) continue;
    const cells = line.split('│').map((s) => s.trim());
    // Expect: ['', name, current, update, latest, workspace, '']
    if (cells.length < 6) continue;
    const [, name, current, update, latest, workspace] = cells as [
      string,
      string,
      string,
      string,
      string,
      string,
      ...string[],
    ];
    if (name === 'Package' || name === '' || name.startsWith('─')) continue;
    rows.push({
      name,
      current,
      update: update.replace(TRAILING_STAR_RE, ''),
      latest: latest.replace(TRAILING_STAR_RE, ''),
      workspace,
      gated: update.endsWith('*'),
    });
  }
  return rows;
}

async function runOutdated(): Promise<{
  rows: OutdatedRow[];
  real: OutdatedRow[];
  gated: OutdatedRow[];
}> {
  const proc = Bun.spawn(['bun', 'outdated', '--no-progress', '--recursive'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'inherit',
  });
  const text = await new Response(proc.stdout).text();
  process.stdout.write(text);
  const code = await proc.exited;
  if (code !== 0) process.exit(code);

  const rows = parseOutdatedRows(text);
  const real = rows.filter((r) => !r.gated && r.current !== r.update);
  const gated = rows.filter((r) => r.gated);
  return { rows, real, gated };
}

// Bun prints `↑ name old → new` per actual bump.
const UPDATE_LINE = /^↑\s/gm;

async function runUpdateAt(
  cwd: string,
  interactive: boolean
): Promise<{ code: number; bumps: number; counted: boolean }> {
  const args = ['bun', 'update', '--latest'];
  if (cwd === ROOT) args.push('--recursive');
  if (interactive) args.push('--interactive');

  if (interactive) {
    // Bun's TUI needs a real terminal; we can't pipe stdout.
    const code = await Bun.spawn(args, {
      cwd,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    }).exited;
    return { code, bumps: 0, counted: false };
  }

  const proc = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'inherit' });
  const text = await new Response(proc.stdout).text();
  process.stdout.write(text);
  const code = await proc.exited;
  const bumps = text.match(UPDATE_LINE)?.length ?? 0;
  return { code, bumps, counted: true };
}

function runInstall(): Promise<number> {
  return Bun.spawn(['bun', 'install'], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited;
}

const fmtMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

async function runVerify(): Promise<number> {
  for (const task of ['types', 'test'] as const) {
    process.stdout.write(`▶ ${task}... `);
    const start = Date.now();
    const code = await Bun.spawn(['bun', 'run', task], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
    }).exited;
    const ms = Date.now() - start;
    if (code !== 0) {
      console.error(`✗ ${task} failed (${fmtMs(ms)})`);
      return code || 1;
    }
    console.log(`✓ (${fmtMs(ms)})`);
  }
  return 0;
}

// ──────────────────────────── main ────────────────────────────

const parsed = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    write: { type: 'boolean', default: false },
    interactive: { type: 'boolean', short: 'i', default: false },
    'fix-drift': { type: 'boolean', default: false },
    verify: { type: 'boolean', default: false },
    'skip-drift': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (parsed.values.help) {
  console.log(helpText);
  process.exit(0);
}

const flags = {
  interactive: parsed.values.interactive,
  fixDrift: parsed.values['fix-drift'],
  verify: parsed.values.verify,
  skipDrift: parsed.values['skip-drift'],
  write: parsed.values.write || parsed.values.interactive,
};
const anyMutation = flags.write || flags.fixDrift;

console.log('── inventory ──');
const allPkgs = findWorkspacePkgs();
if (allPkgs.length === 0) {
  console.error('[doctor] no package.json found, run from the monorepo root');
  process.exit(2);
}
const inventory = buildInventory(allPkgs);
reportInventory(inventory, allPkgs.length);
reportOverrides();

let drift: Drift[] = [];
if (!flags.skipDrift) {
  console.log('\n── drift ──');
  drift = findDrift(inventory);
  reportDrift(drift);
}

if (flags.fixDrift && drift.length > 0) {
  console.log('\n── fix-drift ──');
  const changed = fixDrift(drift);
  if (changed === 0) {
    console.log('  nothing to rewrite');
  } else {
    console.log(`  rewrote ${changed} package.json file(s); reconciling lockfile…`);
    const code = await runInstall();
    if (code !== 0) process.exit(code);
  }
}

console.log('\n── outdated (npm registry) ──');
const before = await runOutdated();

let totalBumps = 0;
let counted = true;

if (flags.write) {
  console.log('\n── update ──');
  const root = await runUpdateAt(ROOT, flags.interactive);
  if (root.code !== 0) process.exit(root.code);
  totalBumps += root.bumps;
  counted = root.counted;

  // `bun update --latest --recursive` doesn't always drill into workspace
  // children. If anything is still really outdated, retry per-workspace.
  if (!flags.interactive) {
    const after = await runOutdated();
    if (after.real.length > 0) {
      const targets = new Set(after.real.map((r) => r.workspace));
      console.log(
        `\n  recursive update left ${after.real.length} package(s) outdated in ${targets.size} workspace(s); retrying per-workspace`
      );
      for (const pkg of allPkgs) {
        if (pkg.workspace === 'root') continue;
        const { code, bumps } = await runUpdateAt(pkg.dir, false);
        if (code !== 0) process.exit(code);
        totalBumps += bumps;
      }
    }
  }
}

if (anyMutation && flags.verify) {
  console.log('\n── verify ──');
  const code = await runVerify();
  if (code !== 0) process.exit(code);
}

// ──────────────────────────── final summary ────────────────────────────

console.log('');
if (flags.write) {
  if (!counted) {
    console.log('✓ interactive update complete, run `bun run ci` to confirm');
  } else if (totalBumps > 0) {
    console.log(`✓ ${totalBumps} package(s) bumped, run \`bun run ci\` to confirm`);
  } else if (before.gated.length > 0 && before.real.length === 0) {
    console.log(
      `  no bumps applied; ${before.gated.length} package(s) held by minimum-release-age (the * rows)`
    );
  } else if (before.real.length > 0) {
    console.log(
      `  bun update made no changes despite ${before.real.length} outdated row(s), check pin styles or overrides`
    );
  } else {
    console.log('  bun update made no changes (nothing was outdated)');
  }
} else if (flags.fixDrift) {
  console.log('✓ drift normalized, run with --write to also bump versions');
} else if (before.real.length > 0) {
  const note =
    before.gated.length > 0 ? ` (${before.gated.length} more held by min-release-age)` : '';
  console.log(`  ${before.real.length} package(s) can update now${note}`);
  console.log('  Run with --write to apply, or --write -i to choose per-package');
  if (drift.length > 0) console.log('  Add --fix-drift to also normalize mismatched specs');
} else if (before.gated.length > 0) {
  console.log(
    `✓ no actionable updates (${before.gated.length} package(s) held by minimum-release-age)`
  );
} else {
  console.log('✓ all dependencies are up to date');
  if (drift.length > 0) {
    console.log('  (drift remains, run with --fix-drift to normalize specs)');
  }
}
