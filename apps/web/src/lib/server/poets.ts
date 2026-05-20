import { safe } from '@orpc/client';
import type { PoetSlug } from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

type PoetsList = ApiOutputs['poets']['list'];
type PoetPoems = ApiOutputs['poets']['listPoems'];

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

export async function getPoetPoemsPage(
  slug: PoetSlug,
  page: number
): Promise<{
  poems: PoetPoems['data'];
  poet: PoetPoems['meta'];
  pagination: PoetPoems['pagination'];
} | null> {
  const { error, data } = await safe(apiServer.poets.listPoems({ slug, page: String(page) }));
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, poet: data.meta, pagination: data.pagination };
}
