import type { ThemeSlug } from '@qafiyah/contracts';
import { apiServer } from '../rpc';
import type { Theme, ThemePoemsResponse } from '../types';
import { dedup, isNotFound } from './dedup';

export function fetchThemes(): Promise<readonly Theme[]> {
  return dedup('themes:list', async () => (await apiServer.themes.list()).data);
}

export async function fetchThemePoemPage(
  slug: ThemeSlug,
  page: number
): Promise<ThemePoemsResponse | null> {
  try {
    return await apiServer.themes.listPoems({ slug, page: page.toString() });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
