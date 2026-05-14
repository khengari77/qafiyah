import { eq, inArray } from 'drizzle-orm';
import type { DbClient } from '../client';
import { FETCH_PER_PAGE, FORMAL_METERS } from '../constants';
import { meterPoems, meterStats } from '../schema';

export type MeterStatsRow = {
  id: number;
  name: string;
  slug: string;
  poemsCount: number;
  poetsCount: number;
};

export type ListMeterPoemsResult = {
  meterDetails: { id: number; name: string; poemsCount: number };
  poems: { title: string; slug: string; poetName: string }[];
  totalPages: number;
};

export async function listMeters(db: DbClient): Promise<MeterStatsRow[]> {
  const results = await db.select().from(meterStats).where(inArray(meterStats.name, FORMAL_METERS));
  return results.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listMeterPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListMeterPoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const meterInfo = await db
    .select({
      meterId: meterPoems.meterId,
      meterName: meterPoems.meterName,
      totalPoems: meterPoems.totalPoemsInMeter,
    })
    .from(meterPoems)
    .where(eq(meterPoems.meterSlug, slug))
    .limit(1);

  if (!meterInfo.length || !meterInfo[0]) return null;

  const poems = await db
    .select({
      title: meterPoems.poemTitle,
      slug: meterPoems.poemSlug,
      poetName: meterPoems.poetName,
    })
    .from(meterPoems)
    .where(eq(meterPoems.meterSlug, slug))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(meterInfo[0].totalPoems / limit);

  return {
    meterDetails: {
      id: meterInfo[0].meterId,
      name: meterInfo[0].meterName,
      poemsCount: meterInfo[0].totalPoems,
    },
    poems,
    totalPages,
  };
}
