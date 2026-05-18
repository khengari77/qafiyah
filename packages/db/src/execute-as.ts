import type { SQL } from 'drizzle-orm';
import * as v from 'valibot';
import type { DbClient } from './client';

export async function executeAs<TSchema extends v.GenericSchema>(
  db: DbClient,
  query: SQL,
  rowSchema: TSchema
): Promise<readonly v.InferOutput<TSchema>[]> {
  const rows = await db.execute(query);
  return v.parse(v.array(rowSchema), rows);
}
