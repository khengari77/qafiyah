import { safe } from '@orpc/client';
import type { EraSlug, PoetSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type PoetsList = ApiOutputs['poets']['list'];
export type Poet = ApiOutputs['poets']['get']['data'];

export async function getPoetsPage(
  page: number
): Promise<{ poets: PoetsList['data']; pagination: PoetsList['pagination'] } | null> {
  const { error, data } = await safe(apiServer.poets.list({ page: String(page) }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return { poets: data.data, pagination: data.pagination };
}

export async function getPoetsByEraPage(
  eraSlug: EraSlug,
  page: number
): Promise<{ poets: PoetsList['data']; pagination: PoetsList['pagination'] } | null> {
  const { error, data } = await safe(apiServer.poets.list({ page: String(page), era: eraSlug }));
  if (error) {
    // A page past the last page returns 404 (the procedure's out-of-range guard);
    // that is the only "nothing to render" case → null → /404. Other errors rethrow.
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return { poets: data.data, pagination: data.pagination };
}

export async function getPoet(slug: PoetSlug): Promise<Poet | null> {
  const { error, data } = await safe(apiServer.poets.get({ slug }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}
