import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { FETCH_PER_PAGE } from '../constants';
import { themePoems, themeStats } from '../schema';

export type ThemeStatsRow = {
  name: string;
  slug: string;
  poemsCount: number;
};

export type ListThemePoemsResult = {
  themeDetails: { name: string; poemsCount: number };
  poems: { title: string; slug: string; poetName: string; meter: string }[];
  total: number;
  totalPages: number;
};

export async function listThemes(db: DbClient): Promise<ThemeStatsRow[]> {
  const results = await db
    .select({
      name: themeStats.name,
      slug: themeStats.slug,
      poemsCount: themeStats.poemsCount,
    })
    .from(themeStats);
  return results.sort((a, b) => b.poemsCount - a.poemsCount);
}

export async function listThemePoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListThemePoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const [themeInfo, poems] = await Promise.all([
    db
      .select({
        themeName: themePoems.themeName,
        totalPoems: themePoems.totalPoemsByTheme,
      })
      .from(themePoems)
      .where(eq(themePoems.themeSlug, slug))
      .limit(1),
    db
      .select({
        title: themePoems.poemTitle,
        slug: themePoems.poemSlug,
        poetName: themePoems.poetName,
        meter: themePoems.meterName,
      })
      .from(themePoems)
      .where(eq(themePoems.themeSlug, slug))
      .limit(limit)
      .offset(offset),
  ]);

  if (!themeInfo.length || !themeInfo[0]) return null;

  const total = themeInfo[0].totalPoems;
  const totalPages = Math.ceil(total / limit);

  return {
    themeDetails: {
      name: themeInfo[0].themeName,
      poemsCount: total,
    },
    poems,
    total,
    totalPages,
  };
}
