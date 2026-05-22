import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';

const schema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.url()),
  ELASTICSEARCH_URL: v.pipe(v.string(), v.url()),
  WORKER_PORT: v.optional(v.string()),
  RECONCILE_TOKEN: v.optional(v.string()),
});

export type WorkerEnv = v.InferOutput<typeof schema>;
export type ParseWorkerEnvError = { readonly kind: 'invalid_env'; readonly issues: readonly string[] };

export function parseWorkerEnv(raw: unknown): Result<WorkerEnv, ParseWorkerEnvError> {
  const result = v.safeParse(schema, raw);
  if (!result.success) return err({ kind: 'invalid_env', issues: result.issues.map((i) => i.message) });
  return ok(result.output);
}
