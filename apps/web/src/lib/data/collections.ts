import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type {
  EraSlug,
  MeterSlug,
  RhymeSlug,
  ThemeSlug,
  poemListItem,
} from '@qafiyah/contracts';
import type * as v from 'valibot';
import { readSnapshotFile } from './loader';

type Era = {
  readonly slug: EraSlug;
  readonly name: string;
  readonly poetsCount: number;
  readonly poemsCount: number;
};
type Meter = { readonly slug: MeterSlug; readonly name: string; readonly poemsCount: number };
type Rhyme = { readonly slug: RhymeSlug; readonly name: string; readonly poemsCount: number };
type Theme = { readonly slug: ThemeSlug; readonly name: string; readonly poemsCount: number };
type PoemListItem = v.InferOutput<typeof poemListItem>;

type Pagination = {
  readonly totalItems: number;
  readonly totalPages: number;
  readonly page: number;
  readonly pageSize: number;
};

type Memo = {
  eras: readonly Era[] | null;
  meters: readonly Meter[] | null;
  rhymes: readonly Rhyme[] | null;
  themes: readonly Theme[] | null;
  eraPoems: ReadonlyMap<EraSlug, readonly PoemListItem[]> | null;
  meterPoems: ReadonlyMap<MeterSlug, readonly PoemListItem[]> | null;
  rhymePoems: ReadonlyMap<RhymeSlug, readonly PoemListItem[]> | null;
  themePoems: ReadonlyMap<ThemeSlug, readonly PoemListItem[]> | null;
};

const memo: Memo = {
  eras: null,
  meters: null,
  rhymes: null,
  themes: null,
  eraPoems: null,
  meterPoems: null,
  rhymePoems: null,
  themePoems: null,
};

function loadList<T>(snapshotName: string, memoKey: keyof Memo): readonly T[] {
  const hit = memo[memoKey] as readonly T[] | null;
  if (hit) return hit;
  const list = readSnapshotFile<T[]>(snapshotName);
  memo[memoKey] = list as never;
  return list;
}

function loadPoemsMap<Slug extends string>(
  snapshotName: string,
  memoKey: keyof Memo,
): ReadonlyMap<Slug, readonly PoemListItem[]> {
  const hit = memo[memoKey] as ReadonlyMap<Slug, readonly PoemListItem[]> | null;
  if (hit) return hit;
  const raw = readSnapshotFile<Record<string, PoemListItem[]>>(snapshotName);
  const map = new Map<Slug, readonly PoemListItem[]>();
  for (const [slug, list] of Object.entries(raw)) {
    map.set(slug as Slug, list);
  }
  memo[memoKey] = map as never;
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

function pageSlice<T>(items: readonly T[], page: number): readonly T[] {
  const start = (page - 1) * POEMS_PER_PAGE;
  return items.slice(start, start + POEMS_PER_PAGE);
}

export function allEras(): readonly Era[] {
  return loadList<Era>('eras', 'eras');
}
export function allMeters(): readonly Meter[] {
  return loadList<Meter>('meters', 'meters');
}
export function allRhymes(): readonly Rhyme[] {
  return loadList<Rhyme>('rhymes', 'rhymes');
}
export function allThemes(): readonly Theme[] {
  return loadList<Theme>('themes', 'themes');
}

export function getEraPoemsPage(
  slug: EraSlug,
  page: number,
): { poems: readonly PoemListItem[]; era: Era; pagination: Pagination } {
  const poems = loadPoemsMap<EraSlug>('era-poems', 'eraPoems').get(slug);
  if (!poems) throw new Error(`era '${slug}' not found in snapshot`);
  const era = allEras().find((e) => e.slug === slug);
  if (!era) throw new Error(`era meta for '${slug}' not found`);
  const pagination = paginationFor(poems.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`era '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`);
  }
  return { poems: pageSlice(poems, page), era, pagination };
}

export function getMeterPoemsPage(
  slug: MeterSlug,
  page: number,
): { poems: readonly PoemListItem[]; meter: Meter; pagination: Pagination } {
  const poems = loadPoemsMap<MeterSlug>('meter-poems', 'meterPoems').get(slug);
  if (!poems) throw new Error(`meter '${slug}' not found in snapshot`);
  const meter = allMeters().find((m) => m.slug === slug);
  if (!meter) throw new Error(`meter meta for '${slug}' not found`);
  const pagination = paginationFor(poems.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`meter '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`);
  }
  return { poems: pageSlice(poems, page), meter, pagination };
}

export function getRhymePoemsPage(
  slug: RhymeSlug,
  page: number,
): { poems: readonly PoemListItem[]; rhyme: Rhyme; pagination: Pagination } {
  const poems = loadPoemsMap<RhymeSlug>('rhyme-poems', 'rhymePoems').get(slug);
  if (!poems) throw new Error(`rhyme '${slug}' not found in snapshot`);
  const rhyme = allRhymes().find((r) => r.slug === slug);
  if (!rhyme) throw new Error(`rhyme meta for '${slug}' not found`);
  const pagination = paginationFor(poems.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`rhyme '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`);
  }
  return { poems: pageSlice(poems, page), rhyme, pagination };
}

export function getThemePoemsPage(
  slug: ThemeSlug,
  page: number,
): { poems: readonly PoemListItem[]; theme: Theme; pagination: Pagination } {
  const poems = loadPoemsMap<ThemeSlug>('theme-poems', 'themePoems').get(slug);
  if (!poems) throw new Error(`theme '${slug}' not found in snapshot`);
  const theme = allThemes().find((t) => t.slug === slug);
  if (!theme) throw new Error(`theme meta for '${slug}' not found`);
  const pagination = paginationFor(poems.length, page);
  if (page < 1 || page > pagination.totalPages) {
    throw new Error(`theme '${slug}' page ${page} out of range (totalPages=${pagination.totalPages})`);
  }
  return { poems: pageSlice(poems, page), theme, pagination };
}

export function __resetCollectionsMemoForTests(): void {
  memo.eras = null;
  memo.meters = null;
  memo.rhymes = null;
  memo.themes = null;
  memo.eraPoems = null;
  memo.meterPoems = null;
  memo.rhymePoems = null;
  memo.themePoems = null;
}
