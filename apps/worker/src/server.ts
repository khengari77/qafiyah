import { POEMS_INDEX_ALIAS, RECONCILE_INTERVAL_MS, WORKER_HEALTH_PORT } from '@qafiyah/constants';
import { createSearchClient, indexHealth } from '@qafiyah/search';
import { parseWorkerEnv, type WorkerEnv } from './env';
import { runReconcile } from './reconcile';
import { runReindex } from './reindex';

type WorkerState = {
  lastReindexAt: string | null;
  lastReconcileAt: string | null;
  lastError: string | null;
};

export function createHealthHandler(deps: {
  getState: () => WorkerState;
  reconcileToken: string | undefined;
  triggerReconcile: () => void;
}) {
  return (req: Request): Response => {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/healthz') {
      return Response.json({ status: 'ok', ...deps.getState() });
    }
    if (req.method === 'POST' && url.pathname === '/reconcile') {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!deps.reconcileToken || token !== deps.reconcileToken) {
        return new Response('unauthorized', { status: 401 });
      }
      deps.triggerReconcile();
      return new Response('accepted', { status: 202 });
    }
    return new Response('not found', { status: 404 });
  };
}

async function boot(env: WorkerEnv): Promise<void> {
  const state: WorkerState = { lastReindexAt: null, lastReconcileAt: null, lastError: null };
  const esResult = createSearchClient(env.ELASTICSEARCH_URL);
  if (esResult.isErr()) {
    console.error(JSON.stringify({ source: 'worker', stage: 'boot_es', error: esResult.error }));
    process.exit(1);
  }
  const es = esResult.value;

  // Initial population: reindex only if the alias is missing/empty.
  const health = await indexHealth(es, POEMS_INDEX_ALIAS);
  if (health.isErr() || health.value.count === 0) {
    if (await runReindex(env)) state.lastReindexAt = new Date().toISOString();
  }

  const reconcileNow = async (): Promise<void> => {
    const ok = await runReconcile(env).catch((cause) => {
      state.lastError = cause instanceof Error ? cause.message : String(cause);
      return false;
    });
    if (ok) {
      state.lastReconcileAt = new Date().toISOString();
      state.lastError = null;
    }
  };
  setInterval(reconcileNow, RECONCILE_INTERVAL_MS);

  const handler = createHealthHandler({
    getState: () => state,
    reconcileToken: env.RECONCILE_TOKEN,
    triggerReconcile: () => {
      reconcileNow().catch(() => undefined);
    },
  });
  Bun.serve({ port: Number(env.WORKER_PORT ?? WORKER_HEALTH_PORT), fetch: handler });
  console.log(
    JSON.stringify({
      source: 'worker',
      stage: 'ready',
      port: Number(env.WORKER_PORT ?? WORKER_HEALTH_PORT),
    })
  );
}

if (import.meta.main) {
  const env = parseWorkerEnv(process.env);
  if (env.isErr()) {
    console.error(JSON.stringify({ source: 'worker', stage: 'env', error: env.error }));
    process.exit(1);
  }
  await boot(env.value);
}
