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
  poemsQueries,
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

type PoemListRow = {
  readonly title: string;
  readonly slug: string;
  readonly poetName: string;
  readonly poetSlug: string;
  readonly meterName: string;
  readonly meterSlug: string;
};

type PoemListItem = {
  readonly title: string;
  readonly slug: string;
  readonly poet: { readonly name: string; readonly slug: string };
  readonly meter: { readonly name: string; readonly slug: string };
};

function toPoemListItem(row: PoemListRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  };
}

function mapToRecord<Slug extends string>(
  map: ReadonlyMap<Slug, readonly PoemListRow[]>
): Record<Slug, PoemListItem[]> {
  const out: Record<string, PoemListItem[]> = {};
  for (const [slug, rows] of map) {
    out[slug] = rows.map(toPoemListItem);
  }
  return out as Record<Slug, PoemListItem[]>;
}

async function mapWithConcurrency<In, Out>(
  inputs: readonly In[],
  concurrency: number,
  fn: (input: In) => Promise<Out>
): Promise<Out[]> {
  const results: Out[] = new Array(inputs.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= inputs.length) return;
      const input = inputs[i];
      if (input === undefined) return;
      results[i] = await fn(input);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker());
  await Promise.all(workers);
  return results;
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

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'era-poems' }));
  const eraPoemsResult = await erasQueries.listAllEraPoems(db);
  if (eraPoemsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'era-poems', message: JSON.stringify(eraPoemsResult.error) });
  }
  await writeJsonAtomic('era-poems', mapToRecord(eraPoemsResult.value));

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'meter-poems' }));
  const meterPoemsResult = await metersQueries.listAllMeterPoems(db);
  if (meterPoemsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'meter-poems', message: JSON.stringify(meterPoemsResult.error) });
  }
  await writeJsonAtomic('meter-poems', mapToRecord(meterPoemsResult.value));

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'rhyme-poems' }));
  const rhymePoemsResult = await rhymesQueries.listAllRhymePoems(db);
  if (rhymePoemsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'rhyme-poems', message: JSON.stringify(rhymePoemsResult.error) });
  }
  await writeJsonAtomic('rhyme-poems', mapToRecord(rhymePoemsResult.value));

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'theme-poems' }));
  const themePoemsResult = await themesQueries.listAllThemePoems(db);
  if (themePoemsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'theme-poems', message: JSON.stringify(themePoemsResult.error) });
  }
  await writeJsonAtomic('theme-poems', mapToRecord(themePoemsResult.value));

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poet-poems' }));
  const poetPoemsResult = await poetsQueries.listAllPoetPoems(db);
  if (poetPoemsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'poet-poems', message: JSON.stringify(poetPoemsResult.error) });
  }
  await writeJsonAtomic('poet-poems', mapToRecord(poetPoemsResult.value));

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poem-slugs' }));
  const slugsResult = await poemsQueries.listAllPoemSlugs(db);
  if (slugsResult.isErr()) {
    reportAndExit({ kind: 'query_failed', entity: 'poem-slugs', message: JSON.stringify(slugsResult.error) });
  }
  const slugs = slugsResult.value;

  console.log(JSON.stringify({ source: 'generate-snapshot', stage: 'poem-details', count: slugs.length }));
  const startedAt = Date.now();
  const details = await mapWithConcurrency(slugs, 20, async (slug) => {
    const result = await poemsQueries.getPoemBySlug(db, slug);
    if (result.isErr()) {
      reportAndExit({
        kind: 'query_failed',
        entity: `poem:${slug}`,
        message: JSON.stringify(result.error),
      });
    }
    return [slug, result.value] as const;
  });
  const elapsed = Date.now() - startedAt;

  const poemsRecord: Record<string, unknown> = {};
  for (const [slug, detail] of details) {
    // Match the contract's poemDetail shape (see apps/api/src/procedures/poems.procedures.ts:toPoemDetail).
    poemsRecord[slug] = {
      title: detail.displayTitle,
      slug,
      verses: detail.parsedContent.verses.map((verse) => [verse[0], verse[1]]),
      verseCount: detail.parsedContent.verseCount,
      sample: detail.parsedContent.sample,
      keywords: detail.parsedContent.keywords,
      poet: { name: detail.metadata.poetName, slug: detail.metadata.poetSlug },
      era: { name: detail.metadata.eraName, slug: detail.metadata.eraSlug },
      meter: { name: detail.metadata.meterName, slug: detail.metadata.meterSlug },
      theme: { name: detail.metadata.themeName, slug: detail.metadata.themeSlug },
      relatedPoems: detail.relatedPoems.map((row) => ({
        title: row.title,
        slug: row.slug,
        poet: { name: row.poetName, slug: row.poetSlug },
        meter: { name: row.meterName, slug: row.meterSlug },
      })),
    };
  }
  await writeJsonAtomic('poems', poemsRecord);
  console.log(JSON.stringify({
    source: 'generate-snapshot',
    stage: 'poem-details-done',
    count: details.length,
    elapsed_ms: elapsed,
  }));

  console.log(JSON.stringify({ source: 'generate-snapshot', status: 'done', output_dir: OUTPUT_DIR }));
}

await main();
