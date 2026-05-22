import {
  POEMS_INDEX_ALIAS,
  POEMS_INDEX_PREFIX,
  POETS_INDEX_ALIAS,
  POETS_INDEX_PREFIX,
} from '@qafiyah/constants';
import { createDb } from '@qafiyah/db';
import { POEMS_INDEX_BODY, POETS_INDEX_BODY, createSearchClient, reindexFromSource } from '@qafiyah/search';
import { parseWorkerEnv } from './env';
import { poemDocFetcher, poetDocFetcher } from './sources';

export async function runReindex(env: {
  DATABASE_URL: string;
  ELASTICSEARCH_URL: string;
}): Promise<boolean> {
  const dbResult = createDb(env.DATABASE_URL);
  const esResult = createSearchClient(env.ELASTICSEARCH_URL);
  if (dbResult.isErr() || esResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'worker',
        stage: 'reindex_init',
        db: dbResult.isErr() ? dbResult.error : null,
        es: esResult.isErr() ? esResult.error : null,
      }),
    );
    return false;
  }
  const db = dbResult.value;
  const es = esResult.value;

  const poems = await reindexFromSource(es, {
    alias: POEMS_INDEX_ALIAS,
    prefix: POEMS_INDEX_PREFIX,
    body: POEMS_INDEX_BODY,
    fetchBatch: poemDocFetcher(db),
    cursorOf: (d) => d.id,
  });
  const poets = await reindexFromSource(es, {
    alias: POETS_INDEX_ALIAS,
    prefix: POETS_INDEX_PREFIX,
    body: POETS_INDEX_BODY,
    fetchBatch: poetDocFetcher(db),
    cursorOf: (d) => d.id,
  });

  console.log(
    JSON.stringify({
      source: 'worker',
      stage: 'reindex',
      poems: poems.isOk() ? poems.value : poems.error,
      poets: poets.isOk() ? poets.value : poets.error,
    }),
  );
  return poems.isOk() && poets.isOk();
}

if (import.meta.main) {
  const env = parseWorkerEnv(process.env);
  if (env.isErr()) {
    console.error(JSON.stringify({ source: 'worker', stage: 'env', error: env.error }));
    process.exit(1);
  }
  process.exit((await runReindex(env.value)) ? 0 : 1);
}
