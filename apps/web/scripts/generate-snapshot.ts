#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress.

/**
 * Reads the production-shaped poetry data straight from Postgres via @qafiyah/db
 * and dumps it as JSON snapshot files under apps/web/.data/. Astro's static build
 * then reads from those files via apps/web/src/lib/data/* — no HTTP, no Wrangler.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDb, type DbClient } from '@qafiyah/db';

const HERE = import.meta.dir;
const WEB_DIR = resolve(HERE, '..');
const OUTPUT_DIR = resolve(WEB_DIR, '.data');

type GeneratorError =
  | { readonly kind: 'missing_env'; readonly name: string }
  | { readonly kind: 'db_connect'; readonly message: string }
  | { readonly kind: 'query_failed'; readonly entity: string; readonly message: string }
  | { readonly kind: 'write_failed'; readonly path: string; readonly message: string };

function reportAndExit(error: GeneratorError): never {
  console.error(
    JSON.stringify({ source: 'generate-snapshot', error, output_dir: OUTPUT_DIR })
  );
  process.exit(1);
}

function readDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) reportAndExit({ kind: 'missing_env', name: 'DATABASE_URL' });
  return url;
}

async function writeJsonAtomic(name: string, value: unknown): Promise<void> {
  const finalPath = resolve(OUTPUT_DIR, `${name}.json`);
  const tmpPath = `${finalPath}.tmp`;
  try {
    await writeFile(tmpPath, JSON.stringify(value), 'utf8');
    await rename(tmpPath, finalPath);
  } catch (cause) {
    reportAndExit({
      kind: 'write_failed',
      path: finalPath,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

async function main(): Promise<void> {
  const databaseUrl = readDatabaseUrl();

  const dbResult = createDb(databaseUrl, { mode: 'long-lived' });
  if (dbResult.isErr()) {
    reportAndExit({
      kind: 'db_connect',
      message: JSON.stringify(dbResult.error),
    });
  }
  const db: DbClient = dbResult.value;

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Entity dumps are added in subsequent tasks (T8-T11).

  // Voids the "unused variable" lint for db/writeJsonAtomic until later tasks consume them.
  void db;
  void writeJsonAtomic;

  console.log(JSON.stringify({ source: 'generate-snapshot', status: 'done', output_dir: OUTPUT_DIR }));
}

await main();
