#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress.

/**
 * Reads the production-shaped poetry data straight from Postgres via @qafiyah/db
 * and dumps it as JSON snapshot files under apps/web/.data/. Astro's static build
 * then reads from those files via apps/web/src/lib/data/* — no HTTP, no Wrangler.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createDb,
  type DbClient,
  erasQueries,
  metersQueries,
  poetsQueries,
  rhymesQueries,
  themesQueries,
} from '@qafiyah/db';

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

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'eras' }));
  const erasResult = await erasQueries.listEras(db);
  if (erasResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'eras', message: JSON.stringify(erasResult.error) });
  }
  await writeJsonAtomic('eras', erasResult.value);

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'meters' }));
  const metersResult = await metersQueries.listMeters(db);
  if (metersResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'meters', message: JSON.stringify(metersResult.error) });
  }
  await writeJsonAtomic('meters', metersResult.value);

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'rhymes' }));
  const rhymesResult = await rhymesQueries.listRhymes(db);
  if (rhymesResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'rhymes', message: JSON.stringify(rhymesResult.error) });
  }
  await writeJsonAtomic('rhymes', rhymesResult.value);

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'themes' }));
  const themesResult = await themesQueries.listThemes(db);
  if (themesResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'themes', message: JSON.stringify(themesResult.error) });
  }
  await writeJsonAtomic('themes', themesResult.value);

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poets' }));
  const poets: Array<{ slug: string; name: string; poemsCount: number }> = [];
  for (let page = 1; ; page++) {
    const pageResult = await poetsQueries.listPoets(db, page);
    if (pageResult.isErr()) {
      reportAndExit({ kind: 'query_failed', entity: 'poets', message: JSON.stringify(pageResult.error) });
    }
    poets.push(...pageResult.value.poets);
    if (page >= pageResult.value.totalPages) break;
  }
  await writeJsonAtomic('poets', poets);

  console.log(JSON.stringify({ source: 'generate-snapshot', status: 'done', output_dir: OUTPUT_DIR }));
}

await main();
