import type { SQL } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import type { DbClient } from './client';

export type ExecuteAsError =
  | { readonly kind: 'sql_error'; readonly message: string }
  | { readonly kind: 'invalid_payload_shape'; readonly issues: readonly string[] };

export async function executeAs<TSchema extends v.GenericSchema>(
  db: DbClient,
  query: SQL,
  rowSchema: TSchema
): Promise<Result<readonly v.InferOutput<TSchema>[], ExecuteAsError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.execute(query),
    (cause): ExecuteAsError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const parsed = v.safeParse(v.array(rowSchema), queryResult.value);
  return parsed.success
    ? ok(parsed.output)
    : err({
        kind: 'invalid_payload_shape',
        issues: parsed.issues.map((i) => i.message),
      });
}
