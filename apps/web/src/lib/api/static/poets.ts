import type { PoetSlug } from '@qafiyah/contracts';
import { apiServer, type Poet, type PoetPoemsResponse, type PoetsResponse } from '../rpc';
import { isNotFound } from './dedup';

export async function fetchPoets(page: number): Promise<PoetsResponse | null> {
  try {
    return await apiServer.poets.list({ page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function fetchPoetsWithPoemCount(): Promise<readonly Poet[]> {
  const allPoets: Poet[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPoets(page);
    if (!response || response.data.length === 0) break;

    allPoets.push(...response.data);

    if (page >= response.pagination.totalPages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allPoets;
}

export async function fetchPoetsTotalPages(): Promise<number> {
  const response = await fetchPoets(1);
  return response?.pagination.totalPages ?? 1;
}

export async function fetchPoetPoemPage(
  slug: PoetSlug,
  page: number
): Promise<PoetPoemsResponse | null> {
  try {
    return await apiServer.poets.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
