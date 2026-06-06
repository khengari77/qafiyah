import { safe } from '@orpc/client';
import type { EraSlug, PoetSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type PoetsList = ApiOutputs['poets']['list'];
export type Poet = ApiOutputs['poets']['get']['data'];

export async function getPoetsPage(
  page: number,
  opts?: { readonly era?: EraSlug | undefined; readonly q?: string | undefined }
): Promise<{ poets: PoetsList['data']; pagination: PoetsList['pagination'] } | null> {
  const { error, data } = await safe(
    apiServer.poets.list({
      page: String(page),
      ...(opts?.era ? { era: opts.era } : {}),
      ...(opts?.q ? { q: opts.q } : {}),
    })
  );
  if (error) throw error;
  // A page past the last page is an empty page, not a missing resource → null → /404.
  if (page > Math.max(1, data.pagination.totalPages)) return null;
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
