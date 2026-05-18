import type { PoemSlug } from '@qafiyah/contracts';
import { apiServer, type Poem } from '@/lib/api/rpc';
import { isNotFound } from './dedup';

export async function fetchAllPoemSlugs(): Promise<readonly PoemSlug[]> {
  const result = await apiServer.poems.listSlugs();
  return result.data as readonly PoemSlug[];
}

export async function fetchPoem(slug: PoemSlug): Promise<Poem | null> {
  try {
    const result = await apiServer.poems.getBySlug({ slug });
    return result.data;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
