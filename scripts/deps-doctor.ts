#!/usr/bin/env bun

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = resolve(`${import.meta.dir}/..`);

// Bun's outdated table starts with `| Package` when anything is outdated; absent otherwise.
const OUTDATED_TABLE_HEADER = /^\s*\|\s*Package\b/m;

const helpText = `doctor, audit and upgrade workspace dependencies

Usage:
  bun scripts/doctor.ts [options]

Options:
  --write            Apply updates via \`bun update --latest --recursive\`
  -i, --interactive  Use Bun's interactive TUI to pick per-package (implies --write)
  --verify           After --write, run \`bun run types\` then \`bun run test\`
  --skip-drift       Skip the cross-workspace drift report
  -h, --help         Show help

Examples:
  bun run deps:doctor                  # diagnose only (read-only)
  bun run deps:doctor --write          # bump everything to latest stable
  bun run deps:doctor --write -i       # choose per-package
  bun run deps:doctor --write --verify # bump, then types + test
`;

type Kind = 'dep' | 'dev';
type Spec = { readonly workspace: string; readonly spec: string; readonly kind: Kind };
type Inventory = Map<string, Spec[]>;

type Pkg = {
  readonly workspace: string;
  readonly deps: Record<string, string>;
  readonly devDeps: Record<string, string>;
};

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
      const pkg = readPkg(join(parentDir, child), `${parent}/${child}`);
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
      record(name, { workspace: pkg.workspace, spec, kind: 'dep' });
    }
    for (const [name, spec] of Object.entries(pkg.devDeps)) {
      if (isWorkspaceRef(spec)) continue;
      record(name, { workspace: pkg.workspace, spec, kind: 'dev' });
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

function reportDrift(inv: Inventory): void {
  let drift = 0;
  for (const [name, occurrences] of inv) {
    const specs = new Set(occurrences.map((o) => o.spec));
    if (specs.size <= 1) continue;
    drift += 1;
    console.log(`  ${name}`);
    for (const o of occurrences) {
      console.log(`    ${o.workspace.padEnd(28)} ${o.spec}  (${o.kind})`);
    }
  }
  if (drift === 0) console.log('  no drift — all shared deps pin identical specs');
  else console.log(`\n  ${drift} dep(s) with mismatched specs across workspaces`);
}

const fmtMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

async function runOutdated(): Promise<{ code: number; hasOutdated: boolean }> {
  const proc = Bun.spawn(['bun', 'outdated', '--no-progress', '--recursive'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'inherit',
  });
  const text = await new Response(proc.stdout).text();
  process.stdout.write(text);
  const code = await proc.exited;
  return { code, hasOutdated: OUTDATED_TABLE_HEADER.test(text) };
}

function runUpdate(interactive: boolean): Promise<number> {
  const args = ['bun', 'update', '--latest', '--recursive'];
  if (interactive) args.push('--interactive');
  return Bun.spawn(args, {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  }).exited;
}

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

const parsed = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    write: { type: 'boolean', default: false },
    interactive: { type: 'boolean', short: 'i', default: false },
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
  verify: parsed.values.verify,
  skipDrift: parsed.values['skip-drift'],
  write: parsed.values.write || parsed.values.interactive,
};

console.log('── inventory ──');
const allPkgs = findWorkspacePkgs();
if (allPkgs.length === 0) {
  console.error('[doctor] no package.json found — run from the monorepo root');
  process.exit(2);
}
const inventory = buildInventory(allPkgs);
reportInventory(inventory, allPkgs.length);
reportOverrides();

if (!flags.skipDrift) {
  console.log('\n── drift ──');
  reportDrift(inventory);
}

console.log('\n── outdated (npm registry) ──');
const { hasOutdated } = await runOutdated();

if (flags.write) {
  console.log('\n── update ──');
  const code = await runUpdate(flags.interactive);
  if (code !== 0) process.exit(code);

  if (flags.verify) {
    console.log('\n── verify ──');
    process.exit(await runVerify());
  }
  console.log('\n✓ deps updated — run `bun run ci` to confirm nothing broke');
} else if (hasOutdated) {
  console.log('\n  Run with --write to apply, or --write -i to choose per-package');
} else {
  console.log('\n✓ all dependencies are up to date');
}
