#!/usr/bin/env bun
import path from 'node:path';
import { parseArgs } from 'node:util';

type EncodeStrategy = { kind: 'lossy'; quality: number } | { kind: 'lossless' };

type OkResult =
  | {
      readonly ok: true;
      readonly src: string;
      readonly out: string;
      readonly bytesIn: number;
      readonly bytesOut: number;
      readonly skipped?: 'fresh' | 'safelist' | 'dry-run';
    }
  | {
      readonly ok: true;
      readonly src: string;
      readonly skipped: 'unsupported';
      readonly message: string;
    };

type FileResult =
  | OkResult
  | {
      readonly ok: false;
      readonly src: string;
      readonly reason: string;
    };

type CliConfig = {
  readonly pathBaseDir: string;
  readonly scanRoots: readonly string[];
  readonly quality: number;
  readonly losslessAll: boolean;
  readonly losslessPngs: boolean;
  readonly maxWidth: number | null;
  readonly replace: boolean;
  readonly force: boolean;
  readonly includeGif: boolean;
  readonly excludeGlobs: readonly Bun.Glob[];
  readonly concurrency: number;
  readonly dryRun: boolean;
  readonly verbose: boolean;
};

const helpText = `optimize-images, convert images to WebP (Bun.Image)

Usage:
  bun scripts/optimize-images.ts [paths...] [options]

Options:
  --root <dir>       Base directory (default: cwd)
  --quality <1-100>  WebP lossy quality (default: 80)
  --lossless         Force lossless WebP for all sources
  --lossless-pngs    Lossless WebP for .png sources only
  --max-width <px>   Fit inside this width; preserve aspect; no upscaling
  --replace          Delete source after successful encode (dangerous)
  --force            Bypass basename safelist and idempotency (re-encode even if .webp is fresh)
  --include-gif      Encode first frame of GIF (animated → static WebP)
  --exclude <glob>   Extra skip pattern (repeatable); matched against repo-relative path
  --concurrency <n>  Parallel encodes (default: available parallelism)
  --dry-run          Print plan only; no writes
  --verbose          Per-file log lines
  -h, --help         Show help

Examples:
  bun run optimize:images -- --dry-run --verbose
  bun run optimize:images apps/web/public/photos --quality 78
`;

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.astro',
  '.vercel',
  'coverage',
  'dumps',
  '.db_setup_backups',
  '.husky',
  '.venv',
  'venv',
  '__pycache__',
  '.image-cache',
]);

const CONVERT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp']);

const SAFELIST_EXACT_BASENAMES = new Set([
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
]);

const SAFELIST_BASE_GLOBS: readonly string[] = [
  'mstile-*.png',
  'open-graph-*.png',
  'twitter-summary-card*.png',
];

function parseCli(): CliConfig | 'help' | 'error' {
  const parsed = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      root: { type: 'string' },
      quality: { type: 'string' },
      lossless: { type: 'boolean', default: false },
      'lossless-pngs': { type: 'boolean', default: false },
      'max-width': { type: 'string' },
      replace: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'include-gif': { type: 'boolean', default: false },
      exclude: { type: 'string', multiple: true },
      concurrency: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (parsed.values.help) return 'help';

  const rootDir = path.resolve(parsed.values.root ?? process.cwd());
  const positionals = parsed.positionals;
  const scanRoots =
    positionals.length > 0 ? positionals.map((p) => path.resolve(rootDir, p)) : [rootDir];

  const qualityRaw = parsed.values.quality;
  const quality = qualityRaw === undefined ? 80 : Number.parseInt(qualityRaw, 10);
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    console.error('[optimize-images] --quality must be 1–100');
    return 'error';
  }

  const maxWidthRaw = parsed.values['max-width'];
  const maxWidth = maxWidthRaw === undefined ? null : Number.parseInt(maxWidthRaw, 10);
  if (maxWidth !== null && (!Number.isFinite(maxWidth) || maxWidth < 1)) {
    console.error('[optimize-images] --max-width must be a positive integer');
    return 'error';
  }

  const concurrencyRaw = parsed.values.concurrency;
  const concurrencyDefault = navigator.hardwareConcurrency ?? 4;
  const concurrency =
    concurrencyRaw === undefined ? concurrencyDefault : Number.parseInt(concurrencyRaw, 10);
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    console.error('[optimize-images] --concurrency must be >= 1');
    return 'error';
  }

  const excludePatterns = parsed.values.exclude ?? [];
  const excludeGlobs = excludePatterns.map((p) => new Bun.Glob(p));

  return {
    pathBaseDir: rootDir,
    scanRoots,
    quality,
    losslessAll: parsed.values.lossless,
    losslessPngs: parsed.values['lossless-pngs'],
    maxWidth,
    replace: parsed.values.replace,
    force: parsed.values.force,
    includeGif: parsed.values['include-gif'],
    excludeGlobs,
    concurrency,
    dryRun: parsed.values['dry-run'],
    verbose: parsed.values.verbose,
  };
}

function toPosixRelative(fromRoot: string, absPath: string): string {
  return path.relative(fromRoot, absPath).split(path.sep).join('/');
}

// Bun.Glob scans all subdirectories; SKIP_DIR_NAMES prunes unwanted trees post-scan.
async function* walkFiles(scanRoot: string): AsyncGenerator<string> {
  const glob = new Bun.Glob('**/*');
  for await (const relPath of glob.scan({ cwd: scanRoot, onlyFiles: true })) {
    const parts = relPath.split('/');
    if (parts.some((part) => SKIP_DIR_NAMES.has(part))) continue;
    yield path.join(scanRoot, relPath);
  }
}

function extensionOf(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

function pickEncodeStrategy(ext: string, cfg: CliConfig): EncodeStrategy | 'skip-gif' {
  if (ext === '.gif' && !cfg.includeGif) return 'skip-gif';
  if (cfg.losslessAll) return { kind: 'lossless' };
  if (cfg.losslessPngs && ext === '.png') return { kind: 'lossless' };
  return { kind: 'lossy', quality: cfg.quality };
}

const safelistGlobInstances: readonly Bun.Glob[] = SAFELIST_BASE_GLOBS.map((p) => new Bun.Glob(p));

function isBasenameSafelisted(basename: string): boolean {
  if (SAFELIST_EXACT_BASENAMES.has(basename)) return true;
  return safelistGlobInstances.some((g) => g.match(basename));
}

function isExcluded(relPosix: string, cfg: CliConfig): boolean {
  return cfg.excludeGlobs.some((g) => g.match(relPosix));
}

function isConvertibleExtension(ext: string, cfg: CliConfig): boolean {
  if (ext === '.webp' || ext === '.svg' || ext === '.ico') return false;
  if (CONVERT_EXTENSIONS.has(ext)) return true;
  if (cfg.includeGif && ext === '.gif') return true;
  return false;
}

function fileSizeOf(filePath: string): number {
  return Bun.file(filePath).size;
}

async function isWebPFresh(outPath: string, srcPath: string): Promise<boolean> {
  const outFile = Bun.file(outPath);
  const srcFile = Bun.file(srcPath);
  if (!(await outFile.exists())) return false;
  if (!(await srcFile.exists())) return false;
  return outFile.lastModified >= srcFile.lastModified;
}

function getImageErrorCode(err: unknown): string | undefined {
  if (err === null || typeof err !== 'object') return undefined;
  if (!('code' in err)) return undefined;
  const { code } = err;
  return typeof code === 'string' ? code : undefined;
}

function formatKb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function encodeToWebP(
  srcPath: string,
  outPath: string,
  strategy: EncodeStrategy,
  maxWidth: number | null
): Promise<{ bytesOut: number }> {
  let pipe = Bun.file(srcPath).image({ autoOrient: true });

  if (maxWidth !== null) {
    pipe = pipe.resize(maxWidth, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const encoded =
    strategy.kind === 'lossless'
      ? pipe.webp({ lossless: true })
      : pipe.webp({ quality: strategy.quality });

  const bytesWritten = await encoded.write(outPath);
  return { bytesOut: bytesWritten };
}

async function processOne(absPath: string, cfg: CliConfig): Promise<FileResult> {
  const ext = extensionOf(absPath);
  if (!isConvertibleExtension(ext, cfg)) {
    return { ok: true, src: absPath, skipped: 'unsupported', message: 'extension not targeted' };
  }

  const rel = toPosixRelative(cfg.pathBaseDir, absPath);
  if (isExcluded(rel, cfg)) {
    return { ok: true, src: absPath, skipped: 'unsupported', message: `excluded: ${rel}` };
  }

  const basename = path.basename(absPath);
  if (!cfg.force && isBasenameSafelisted(basename)) {
    return {
      ok: true,
      src: absPath,
      out: `${path.join(path.dirname(absPath), path.parse(absPath).name)}.webp`,
      bytesIn: 0,
      bytesOut: 0,
      skipped: 'safelist',
    };
  }

  const strategy = pickEncodeStrategy(ext, cfg);
  if (strategy === 'skip-gif') {
    return {
      ok: true,
      src: absPath,
      skipped: 'unsupported',
      message: 'gif skipped (use --include-gif)',
    };
  }

  const outPath = `${path.join(path.dirname(absPath), path.parse(absPath).name)}.webp`;

  if (!cfg.force && (await isWebPFresh(outPath, absPath))) {
    return {
      ok: true,
      src: absPath,
      out: outPath,
      bytesIn: fileSizeOf(absPath),
      bytesOut: fileSizeOf(outPath),
      skipped: 'fresh',
    };
  }

  const bytesIn = fileSizeOf(absPath);

  if (cfg.dryRun) {
    return { ok: true, src: absPath, out: outPath, bytesIn, bytesOut: 0, skipped: 'dry-run' };
  }

  try {
    const { bytesOut } = await encodeToWebP(absPath, outPath, strategy, cfg.maxWidth);

    if (cfg.replace) {
      try {
        await Bun.file(absPath).delete();
      } catch {
        // best-effort, match `rm -f` semantics
      }
    }
    return { ok: true, src: absPath, out: outPath, bytesIn, bytesOut };
  } catch (err) {
    const code = getImageErrorCode(err);
    if (code === 'ERR_IMAGE_FORMAT_UNSUPPORTED') {
      return {
        ok: true,
        src: absPath,
        skipped: 'unsupported',
        message: 'ERR_IMAGE_FORMAT_UNSUPPORTED',
      };
    }
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, src: absPath, reason };
  }
}

async function collectFiles(cfg: CliConfig): Promise<string[]> {
  const out: string[] = [];
  for (const root of cfg.scanRoots) {
    for await (const file of walkFiles(root)) {
      out.push(file);
    }
  }
  return out;
}

async function runConcurrentPool(
  readonlyItems: readonly string[],
  concurrency: number,
  fn: (item: string) => Promise<void>
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= readonlyItems.length) return;
      const item = readonlyItems[idx];
      if (item === undefined) return;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  const parsed = parseCli();
  if (parsed === 'help') {
    console.log(helpText);
    process.exit(0);
  }
  if (parsed === 'error') {
    process.exit(2);
  }

  const cfg = parsed;
  const candidates = await collectFiles(cfg);
  const actionable = candidates.filter((p) => isConvertibleExtension(extensionOf(p), cfg));

  const results: FileResult[] = [];
  await runConcurrentPool(actionable, cfg.concurrency, async (file) => {
    results.push(await processOne(file, cfg));
  });

  let encoded = 0;
  let skippedFresh = 0;
  let skippedSafelist = 0;
  let skippedDryRun = 0;
  let skippedOther = 0;
  let errors = 0;
  let bytesInEncoded = 0;
  let bytesOutEncoded = 0;

  for (const r of results) {
    if (!r.ok) {
      errors += 1;
      console.error(`[optimize-images] FAIL ${r.src}\n  ${r.reason}`);
      continue;
    }

    if (r.skipped === 'unsupported') {
      skippedOther += 1;
      if (cfg.verbose && r.message !== 'extension not targeted') {
        console.log(`[optimize-images] skip ${r.src}, ${r.message}`);
      }
      continue;
    }

    const outcome = r.skipped;
    switch (outcome) {
      case 'safelist': {
        skippedSafelist += 1;
        if (cfg.verbose) console.log(`[optimize-images] safelist ${r.src}`);
        break;
      }
      case 'fresh': {
        skippedFresh += 1;
        if (cfg.verbose) {
          console.log(`[optimize-images] fresh ${r.src} → ${r.out} (${formatKb(r.bytesOut)} kept)`);
        }
        break;
      }
      case 'dry-run': {
        skippedDryRun += 1;
        if (cfg.verbose) {
          console.log(
            `[optimize-images] dry-run ${r.src} → ${r.out} (source ${formatKb(r.bytesIn)})`
          );
        }
        break;
      }
      case undefined: {
        encoded += 1;
        bytesInEncoded += r.bytesIn;
        bytesOutEncoded += r.bytesOut;
        const saved = r.bytesIn - r.bytesOut;
        if (cfg.verbose && saved !== 0) {
          const pct = r.bytesIn > 0 ? ((saved / r.bytesIn) * 100).toFixed(1) : '0';
          console.log(
            `[optimize-images] ok ${r.src} → ${r.out}  ${formatKb(r.bytesIn)} → ${formatKb(r.bytesOut)} (-${pct}%)`
          );
        } else if (cfg.verbose) {
          console.log(`[optimize-images] ok ${r.src} → ${r.out}  ${formatKb(r.bytesIn)}`);
        }
        break;
      }
      default: {
        const _never: never = outcome;
        throw new Error(`[optimize-images] unhandled: ${String(_never)}`);
      }
    }
  }

  console.log(
    `[optimize-images] summary: encoded=${encoded} fresh=${skippedFresh} safelist=${skippedSafelist} dry-run/planned=${skippedDryRun} other-skip=${skippedOther} errors=${errors}`
  );
  if (encoded > 0 && !cfg.dryRun) {
    const saved = bytesInEncoded - bytesOutEncoded;
    console.log(
      `[optimize-images] bytes: ${bytesInEncoded} → ${bytesOutEncoded} (saved ${saved}, ${bytesInEncoded > 0 ? ((saved / bytesInEncoded) * 100).toFixed(1) : '0'}%)`
    );
  }

  if (errors > 0 && !cfg.dryRun) {
    process.exit(1);
  }
}

await main();
