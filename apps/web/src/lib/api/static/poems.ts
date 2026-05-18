import type { PoemSlug } from '@qafiyah/contracts';
import type { Result } from 'neverthrow';
import { apiServer, type Poem } from '@/lib/api/rpc';
import { type ApiFetchError, callApi } from './result';

export async function fetchAllPoemSlugs(): Promise<Result<readonly PoemSlug[], ApiFetchError>> {
  const result = await callApi('poems.listPoemSlugs', undefined, () =>
    apiServer.poems.listPoemSlugs()
  );
  return result.map((res) => res.data as readonly PoemSlug[]);
}

export async function fetchPoem(slug: PoemSlug): Promise<Result<Poem, ApiFetchError>> {
  const result = await callApi('poems.getPoemBySlug', { slug }, () =>
    apiServer.poems.getPoemBySlug({ slug })
  );
  return result.map((res) => res.data);
}
