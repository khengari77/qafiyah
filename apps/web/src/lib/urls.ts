import { CAT_POET_PREFIX_REGEX } from '@/constants';

export type TaxonomySection = 'eras' | 'meters' | 'rhymes' | 'themes' | 'collections';

/**
 * Public poet slug: lowercased with the internal `cat-poet-` prefix stripped.
 * Inbound links, sitemap entries, and a poet page's own canonical must all
 * agree on this single form.
 */
export function normalizePoetSlug(slug: string): string {
  return String(slug).toLowerCase().replace(CAT_POET_PREFIX_REGEX, '');
}

/**
 * Appends `?page=N` only for N >= 2. The first page is the bare resource URL,
 * so it never carries a page number.
 */
function withPage(path: string, page?: number): string {
  return page && page > 1 ? `${path}?page=${page}` : path;
}

/** Taxonomy index — the list of terms, e.g. `/eras`. */
export function taxonomyIndexUrl(section: TaxonomySection): string {
  return `/${section}`;
}

/** Poems under one taxonomy term, e.g. `/eras/jahili` or `/eras/jahili?page=3`. */
export function taxonomyUrl(section: TaxonomySection, slug: string, page?: number): string {
  return withPage(`/${section}/${slug}`, page);
}

/** The poets list, e.g. `/poets` or `/poets?page=2`. */
export function poetsUrl(page?: number): string {
  return withPage('/poets', page);
}

/** One poet's diwan, e.g. `/poets/mutanabbi` or `/poets/mutanabbi?page=4`. */
export function poetUrl(slug: string, page?: number): string {
  return withPage(`/poets/${normalizePoetSlug(slug)}`, page);
}

/** A single poem, e.g. `/poems/TnKK`. */
export function poemUrl(slug: string): string {
  return `/poems/${slug}`;
}
