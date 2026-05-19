import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { PoetSlug, poemListItem } from '@qafiyah/contracts';
import type * as v from 'valibot';
import { readSnapshotFile } from './loader';

type Poet = { readonly slug: PoetSlug; readonly name: string; readonly poemsCount: number };
type PoemListItem = v.InferOutput<typeof poemListItem>;

type Pagination = {
  readonly totalItems: number;
  readonly totalPages: number;
  readonly page: number;
  readonly pageSize: number;
};

let poetsMemo: readonly Poet[] | null = null;
let poetPoemsMemo: ReadonlyMap<PoetSlug, readonly PoemListItem[]> | null = null;

function loadPoets(): readonly Poet[] {
  if (poetsMemo) return poetsMemo;
  poetsMemo = readSnapshotFile<Poet[]>('poets');
  return poetsMemo;
}

function loadPoetPoems(): ReadonlyMap<PoetSlug, readonly PoemListItem[]> {
  if (poetPoemsMemo) return poetPoemsMemo;
  const raw = readSnapshotFile<Record<string, PoemListItem[]>>('poet-poems');
  const map = new Map<PoetSlug, readonly PoemListItem[]>();
  for (const [slug, list] of Object.entries(raw)) {
    map.set(slug as PoetSlug, list);
  }
  poetPoemsMemo = map;
  return map;
}

function paginationFor(totalItems: number, page: number): Pagination {
  return {
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / POEMS_PER_PAGE)),
    page,
    pageSize: POEMS_PER_PAGE,
  };
}

export function allPoets(): readonly Poet[] {
  return loadPoets();
}

export function getPoetsPage(page: number): { poets: readonly Poet[]; pagination: Pagination } {
  const poets = loadPoets();
  const pagination = paginationFor(poets.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`poets page ${page} out of range (totalPages=${pagination.totalPages})`);
  }
  const start = (page - 1) * POEMS_PER_PAGE;
  return { poets: poets.slice(start, start + POEMS_PER_PAGE), pagination };
}

export function getPoetPoemsPage(
  slug: PoetSlug,
  page: number
): {
  poems: readonly PoemListItem[];
  poet: Poet;
  pagination: Pagination;
} {
  const poems = loadPoetPoems().get(slug);
  if (!poems) throw new Error(`poet '${slug}' not found in snapshot`);
  const poet = loadPoets().find((p) => p.slug === slug);
  if (!poet) throw new Error(`poet meta for '${slug}' not found in poets snapshot`);
  const pagination = paginationFor(poems.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(
      `poet '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`
    );
  }
  const start = (page - 1) * POEMS_PER_PAGE;
  return { poems: poems.slice(start, start + POEMS_PER_PAGE), poet, pagination };
}

export function __resetPoetsMemoForTests(): void {
  poetsMemo = null;
  poetPoemsMemo = null;
}
