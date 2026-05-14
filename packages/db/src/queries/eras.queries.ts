import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { ERAS_SORT_ORDER, FETCH_PER_PAGE } from '../constants';
import { eraPoems, eraStats } from '../schema';

export type EraStatsRow = {
  id: number;
  name: string;
  slug: string;
  poetsCount: number;
  poemsCount: number;
};

export type ListEraPoemsResult = {
  eraDetails: { id: number; name: string; poemsCount: number };
  poems: { title: string; slug: string; poetName: string; meter: string }[];
  totalPages: number;
};

export async function listEras(db: DbClient): Promise<EraStatsRow[]> {
  const results = await db.select().from(eraStats);
  return results.sort((a, b) => ERAS_SORT_ORDER.indexOf(a.name) - ERAS_SORT_ORDER.indexOf(b.name));
}

export async function listEraPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListEraPoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const eraInfo = await db
    .select({
      eraId: eraPoems.eraId,
      eraName: eraPoems.eraName,
      totalPoems: eraPoems.totalPoemsInEra,
    })
    .from(eraPoems)
    .where(eq(eraPoems.eraSlug, slug))
    .limit(1);

  if (!eraInfo.length || !eraInfo[0]) return null;

  const poems = await db
    .select({
      title: eraPoems.poemTitle,
      slug: eraPoems.poemSlug,
      poetName: eraPoems.poetName,
      meter: eraPoems.meterName,
    })
    .from(eraPoems)
    .where(eq(eraPoems.eraSlug, slug))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(eraInfo[0].totalPoems / limit);

  return {
    eraDetails: {
      id: eraInfo[0].eraId,
      name: eraInfo[0].eraName,
      poemsCount: eraInfo[0].totalPoems,
    },
    poems,
    totalPages,
  };
}
