import type { PoetSlug } from '@qafiyah/contracts';
import { err, ok, type Result } from 'neverthrow';
import { match } from 'ts-pattern';
import { apiServer, type Poet, type PoetPoemsResponse, type PoetsResponse } from '@/lib/api/rpc';
import { type ApiFetchError, callApi } from './result';

export function fetchPoetsPage(page: number): Promise<Result<PoetsResponse, ApiFetchError>> {
  return callApi('poets.list', { page }, () => apiServer.poets.list({ page: page.toString() }));
}

export async function fetchAllPoets(): Promise<Result<readonly Poet[], ApiFetchError>> {
  const allPoets: Poet[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPoetsPage(page);
    if (response.isErr()) {
      const action = match(response.error)
        .with({ kind: 'not_found' }, () => 'stop' as const)
        .with({ kind: 'transport' }, () => 'fail' as const)
        .exhaustive();
      if (action === 'stop') break;
      return err(response.error);
    }
    if (response.value.data.length === 0) break;

    allPoets.push(...response.value.data);

    if (page >= response.value.pagination.totalPages) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return ok(allPoets);
}

export async function fetchPoetsTotalPages(): Promise<Result<number, ApiFetchError>> {
  const response = await fetchPoetsPage(1);
  if (response.isErr()) {
    return match(response.error)
      .with({ kind: 'not_found' }, () => ok(1))
      .with({ kind: 'transport' }, (e) => err<number, ApiFetchError>(e))
      .exhaustive();
  }
  return ok(response.value.pagination.totalPages);
}

export function fetchPoetPoemPage(
  slug: PoetSlug,
  page: number
): Promise<Result<PoetPoemsResponse, ApiFetchError>> {
  return callApi('poets.listPoems', { slug, page }, () =>
    apiServer.poets.listPoems({ slug, page: page.toString() })
  );
}
