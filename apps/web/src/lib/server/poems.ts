import { safe } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Poem = ApiOutputs['poems']['getPoemBySlug']['data'];

export async function getPoem(slug: PoemSlug): Promise<Poem | null> {
  const { error, data } = await safe(apiServer.poems.getPoemBySlug({ slug }));
  if (error) {
    // The API returns 404 for a missing or malformed poem slug; that is the only
    // "no renderable poem" case → null → 404. Genuine errors (500, transport
    // failure) rethrow → 500.
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}
