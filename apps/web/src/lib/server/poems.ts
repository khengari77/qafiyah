import { safe } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Poem = ApiOutputs['poems']['getPoemBySlug']['data'];

export async function getPoem(slug: PoemSlug): Promise<Poem | null> {
  const { error, data } = await safe(apiServer.poems.getPoemBySlug({ slug }));
  if (error) {
    // The API returns 500 (POEM_PARSE_ERROR) for a missing or unparseable poem — it
    // does not use 404 here — so treat any 404/500 response as "no renderable poem"
    // → 404. A transport failure is not an ORPCError (errorStatus null) → rethrow → 500.
    const status = errorStatus(error);
    if (status === 404 || status === 500) return null;
    throw error;
  }
  return data.data;
}
