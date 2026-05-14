import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { FETCH_PER_PAGE } from '../constants';
import { themePoems, themeStats } from '../schema';

export type ThemeStatsRow = {
  id: number;
  name: string;
  slug: string;
  poemsCount: number;
  poetsCount: number;
};

export type ListThemePoemsResult = {
  themeDetails: { id: number; name: string; poemsCount: number };
  poems: { title: string; slug: string; poetName: string; meter: string }[];
  totalPages: number;
};

export async function listThemes(db: DbClient): Promise<ThemeStatsRow[]> {
  const results = await db.select().from(themeStats);
  return results.sort((a, b) => b.poemsCount - a.poemsCount);
}

export async function listThemePoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListThemePoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const themeInfo = await db
    .select({
      themeId: themePoems.themeId,
      themeName: themePoems.themeName,
      totalPoems: themePoems.totalPoemsByTheme,
    })
    .from(themePoems)
    .where(eq(themePoems.themeSlug, slug))
    .limit(1);

  if (!themeInfo.length || !themeInfo[0]) return null;

  const poems = await db
    .select({
      title: themePoems.poemTitle,
      slug: themePoems.poemSlug,
      poetName: themePoems.poetName,
      meter: themePoems.meterName,
    })
    .from(themePoems)
    .where(eq(themePoems.themeSlug, slug))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(themeInfo[0].totalPoems / limit);

  return {
    themeDetails: {
      id: themeInfo[0].themeId,
      name: themeInfo[0].themeName,
      poemsCount: themeInfo[0].totalPoems,
    },
    poems,
    totalPages,
  };
}
