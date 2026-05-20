import { isDefinedError, safe } from '@orpc/client';
import type { PoemSlug } from '@qafiyah/contracts';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Poem = ApiOutputs['poems']['getPoemBySlug']['data'];

export async function getPoem(slug: PoemSlug): Promise<Poem | null> {
  const { error, data } = await safe(apiServer.poems.getPoemBySlug({ slug }));
  if (error) {
    if (isDefinedError(error) && error.code === 'NOT_FOUND') return null;
    throw error;
  }
  return data.data;
}
