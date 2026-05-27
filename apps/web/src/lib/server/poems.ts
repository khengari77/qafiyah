import { safe } from '@orpc/client';
import type {
  CollectionSlug,
  EraSlug,
  MeterSlug,
  PoemSlug,
  PoetSlug,
  RhymeSlug,
  ThemeSlug,
} from '@qafiyah/contracts';
import { errorStatus } from './api-error';
import { apiServer } from './client';
import type { ApiOutputs } from './types';

export type Poem = ApiOutputs['poems']['get']['data'];

export type PoemFilters = {
  readonly poetSlugs?: readonly PoetSlug[];
  readonly eraSlugs?: readonly EraSlug[];
  readonly themeSlugs?: readonly ThemeSlug[];
  readonly meterSlugs?: readonly MeterSlug[];
  readonly rhymeSlugs?: readonly RhymeSlug[];
  readonly collectionSlugs?: readonly CollectionSlug[];
};

type PoemsListOutput = ApiOutputs['poems']['list'];

export async function getPoem(slug: PoemSlug): Promise<Poem | null> {
  const { error, data } = await safe(apiServer.poems.get({ slug }));
  if (error) {
    // The API returns 404 for a missing or malformed poem slug; that is the only
    // "no renderable poem" case → null → 404. Genuine errors (500, transport
    // failure) rethrow → 500.
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return data.data;
}

export async function listPoems(
  filters: PoemFilters,
  page: number
): Promise<{ poems: PoemsListOutput['data']; pagination: PoemsListOutput['pagination'] } | null> {
  const { error, data } = await safe(
    apiServer.poems.list({
      page: String(page),
      poet: [...(filters.poetSlugs ?? [])],
      era: [...(filters.eraSlugs ?? [])],
      theme: [...(filters.themeSlugs ?? [])],
      meter: [...(filters.meterSlugs ?? [])],
      rhyme: [...(filters.rhymeSlugs ?? [])],
      collection: [...(filters.collectionSlugs ?? [])],
    })
  );
  if (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, pagination: data.pagination };
}
