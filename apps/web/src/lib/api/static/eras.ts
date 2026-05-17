import type { EraSlug } from '@qafiyah/contracts';
import { apiServer, type Era, type EraPoemsResponse } from '../rpc';
import { dedup, isNotFound } from './dedup';

export function fetchEras(): Promise<readonly Era[]> {
  return dedup('eras:list', async () => (await apiServer.eras.list()).data);
}

export async function fetchEraPoemPage(
  slug: EraSlug,
  page: number
): Promise<EraPoemsResponse | null> {
  try {
    return await apiServer.eras.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
