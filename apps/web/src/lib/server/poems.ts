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
import { apiServer } from './client';
import type { ApiOutputs } from './types';
import { getOrNull } from './unwrap';

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

// The API returns 404 for a missing or malformed poem slug; that is the only
// "no renderable poem" case → null → 404. Genuine errors (500, transport
// failure) rethrow → 500.
export const getPoem = (slug: PoemSlug): Promise<Poem | null> =>
  getOrNull(apiServer.poems.get({ slug }));

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
  if (error) throw error;
  if (page > data.pagination.totalPages) return null;
  return { poems: data.data, pagination: data.pagination };
}
