import { POEMS_INDEX_ALIAS, POETS_INDEX_ALIAS } from '@qafiyah/constants';
import { createDb } from '@qafiyah/db';
import { createSearchClient, reconcileFromSource } from '@qafiyah/search';
import { parseWorkerEnv } from './env';
import {
  fetchPoemDocsBySlugs,
  fetchPoetDocsBySlugs,
  poemSourceKeys,
  poetSourceKeys,
} from './sources';

export async function runReconcile(env: {
  DATABASE_URL: string;
  ELASTICSEARCH_URL: string;
}): Promise<boolean> {
  const dbResult = createDb(env.DATABASE_URL);
  const esResult = createSearchClient(env.ELASTICSEARCH_URL);
  if (dbResult.isErr() || esResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'worker',
        stage: 'reconcile_init',
        db: dbResult.isErr() ? dbResult.error : null,
        es: esResult.isErr() ? esResult.error : null,
      }),
    );
    return false;
  }
  const db = dbResult.value;
  const es = esResult.value;

  const poems = await reconcileFromSource(es, {
    alias: POEMS_INDEX_ALIAS,
    sourceKeys: () => poemSourceKeys(db),
    fetchDocs: (slugs) => fetchPoemDocsBySlugs(db, slugs),
  });
  const poets = await reconcileFromSource(es, {
    alias: POETS_INDEX_ALIAS,
    sourceKeys: () => poetSourceKeys(db),
    fetchDocs: (slugs) => fetchPoetDocsBySlugs(db, slugs),
  });

  console.log(
    JSON.stringify({
      source: 'worker',
      stage: 'reconcile',
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
  process.exit((await runReconcile(env.value)) ? 0 : 1);
}
