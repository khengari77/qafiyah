import type { RhymeSlug } from '@qafiyah/contracts';
import { apiServer } from '../rpc';
import type { Rhyme, RhymePoemsResponse } from '../types';
import { dedup, isNotFound } from './dedup';

export function fetchRhymes(): Promise<readonly Rhyme[]> {
  return dedup('rhymes:list', async () => (await apiServer.rhymes.list()).data);
}

export async function fetchRhymePoemPage(
  slug: RhymeSlug,
  page: number
): Promise<RhymePoemsResponse | null> {
  try {
    return await apiServer.rhymes.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
