import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { FETCH_PER_PAGE } from '../constants';
import { poetPoems, poetStats } from '../schema';

export type PoetStatsRow = {
  name: string;
  slug: string;
  poemsCount: number;
};

export type ListPoetsResult = {
  poets: PoetStatsRow[];
  total: number;
  totalPages: number;
};

export type ListPoetPoemsResult = {
  poetDetails: { name: string; poemsCount: number };
  poems: { title: string; slug: string; meter: string }[];
  total: number;
  totalPages: number;
};

export async function listPoets(db: DbClient, page: number): Promise<ListPoetsResult> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const poets = await db
    .select({
      name: poetStats.name,
      slug: poetStats.slug,
      poemsCount: poetStats.poemsCount,
    })
    .from(poetStats)
    .limit(limit)
    .offset(offset);
  const total = await db.$count(poetStats);
  const totalPages = Math.ceil(total / limit);

  return { poets, total, totalPages };
}

export async function listPoetPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListPoetPoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const poetInfo = await db
    .select({
      poetName: poetPoems.poetName,
      totalPoems: poetPoems.totalPoemsByPoet,
    })
    .from(poetPoems)
    .where(eq(poetPoems.poetSlug, slug))
    .limit(1);

  if (!poetInfo.length || !poetInfo[0]) return null;

  const poems = await db
    .select({
      title: poetPoems.poemTitle,
      slug: poetPoems.poemSlug,
      meter: poetPoems.meterName,
    })
    .from(poetPoems)
    .where(eq(poetPoems.poetSlug, slug))
    .limit(limit)
    .offset(offset);

  const total = poetInfo[0].totalPoems;
  const totalPages = Math.ceil(total / limit);

  return {
    poetDetails: {
      name: poetInfo[0].poetName,
      poemsCount: total,
    },
    poems,
    total,
    totalPages,
  };
}
