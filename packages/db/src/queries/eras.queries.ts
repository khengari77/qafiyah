import { ERAS_SORT_ORDER, POEMS_PER_PAGE } from '@qafiyah/constants';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { eraPoems, eraStats } from '../schema';

export type EraStatsRow = {
  name: string;
  slug: string;
  poetsCount: number;
  poemsCount: number;
};

export type ListEraPoemsResult = {
  eraDetails: { name: string; poemsCount: number };
  poems: { title: string; slug: string; poetName: string; meter: string }[];
  total: number;
  totalPages: number;
};

export async function listEras(db: DbClient): Promise<EraStatsRow[]> {
  const results = await db
    .select({
      name: eraStats.name,
      slug: eraStats.slug,
      poetsCount: eraStats.poetsCount,
      poemsCount: eraStats.poemsCount,
    })
    .from(eraStats);
  return results.sort((a, b) => ERAS_SORT_ORDER.indexOf(a.name) - ERAS_SORT_ORDER.indexOf(b.name));
}

export async function listEraPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListEraPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const [eraInfo, poems] = await Promise.all([
    db
      .select({
        eraName: eraPoems.eraName,
        totalPoems: eraPoems.totalPoemsInEra,
      })
      .from(eraPoems)
      .where(eq(eraPoems.eraSlug, slug))
      .limit(1),
    db
      .select({
        title: eraPoems.poemTitle,
        slug: eraPoems.poemSlug,
        poetName: eraPoems.poetName,
        meter: eraPoems.meterName,
      })
      .from(eraPoems)
      .where(eq(eraPoems.eraSlug, slug))
      .limit(limit)
      .offset(offset),
  ]);

  if (!eraInfo.length || !eraInfo[0]) return null;

  const total = eraInfo[0].totalPoems;
  const totalPages = Math.ceil(total / limit);

  return {
    eraDetails: {
      name: eraInfo[0].eraName,
      poemsCount: total,
    },
    poems,
    total,
    totalPages,
  };
}
