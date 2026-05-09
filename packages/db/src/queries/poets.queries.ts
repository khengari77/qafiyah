import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { FETCH_PER_PAGE } from '../constants';
import { poemsFullData, poetPoems, poetStats } from '../schema';

export async function listPoets(db: DbClient, page: number) {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const poets = await db.select().from(poetStats).limit(limit).offset(offset);
  const totalPoets = await db.$count(poetStats);
  const totalPages = Math.ceil(totalPoets / limit);

  return { poets, totalPoets, totalPages };
}

export async function getPoetBySlug(db: DbClient, slug: string) {
  const poetInfo = await db
    .select({
      poetId: poetPoems.poetId,
      poetName: poetPoems.poetName,
      totalPoems: poetPoems.totalPoemsByPoet,
    })
    .from(poetPoems)
    .where(eq(poetPoems.poetSlug, slug))
    .limit(1);

  if (!poetInfo.length || !poetInfo[0]) return null;

  const eraInfo = await db
    .select({ eraName: poemsFullData.era_name, eraSlug: poemsFullData.era_slug })
    .from(poemsFullData)
    .where(eq(poemsFullData.poet_slug, slug))
    .limit(1);

  return {
    poet: {
      name: poetInfo[0].poetName,
      poemsCount: poetInfo[0].totalPoems,
      era:
        eraInfo.length && eraInfo[0] && eraInfo[0].eraName && eraInfo[0].eraSlug
          ? { name: eraInfo[0].eraName, slug: eraInfo[0].eraSlug }
          : null,
    },
  };
}

export async function listPoetPoems(db: DbClient, slug: string, page: number) {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const poetInfo = await db
    .select({
      poetId: poetPoems.poetId,
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

  const totalPages = Math.ceil(poetInfo[0].totalPoems / limit);

  return {
    poetDetails: {
      id: poetInfo[0].poetId,
      name: poetInfo[0].poetName,
      poemsCount: poetInfo[0].totalPoems,
    },
    poems,
    totalPages,
  };
}
