import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { ARABIC_LETTERS_MAP, FETCH_PER_PAGE } from '../constants';
import { rhymePoems, rhymeStats } from '../schema';
import { normalizeRhymePattern } from '../utils/normalize-rhyme-pattern';

export async function listRhymes(db: DbClient) {
  const results = await db.select().from(rhymeStats);

  const groupedRhymes = new Map<
    string,
    { rhymes: typeof results; totalPoemsCount: number; totalPoetsCount: number }
  >();

  for (const rhyme of results) {
    const cleanPattern = normalizeRhymePattern(rhyme.pattern);

    for (const [letterName, variants] of ARABIC_LETTERS_MAP.entries()) {
      if (variants.includes(cleanPattern)) {
        let group = groupedRhymes.get(letterName);
        if (!group) {
          group = { rhymes: [], totalPoemsCount: 0, totalPoetsCount: 0 };
          groupedRhymes.set(letterName, group);
        }
        group.rhymes.push(rhyme);
        group.totalPoemsCount += rhyme.poemsCount;
        group.totalPoetsCount += rhyme.poetsCount;
        break;
      }
    }
  }

  const enrichedGroups = Array.from(groupedRhymes.entries()).map(
    ([letter, { rhymes, totalPoemsCount, totalPoetsCount }]) => {
      const firstRhyme = rhymes[0];
      if (!firstRhyme) throw new Error();
      return {
        id: firstRhyme.id,
        name: letter,
        slug: firstRhyme.slug,
        poetsCount: totalPoetsCount,
        poemsCount: totalPoemsCount,
        totalUsage: totalPoetsCount + totalPoemsCount,
      };
    }
  );

  return enrichedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listRhymePoems(db: DbClient, slug: string, page: number) {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const rhymeInfo = await db
    .select({
      rhymeId: rhymePoems.rhymeId,
      rhymePattern: rhymePoems.rhymePattern,
      totalPoems: rhymePoems.totalPoemsByRhyme,
    })
    .from(rhymePoems)
    .where(eq(rhymePoems.rhymeSlug, slug))
    .limit(1);

  if (!rhymeInfo.length || !rhymeInfo[0]) return null;

  const poems = await db
    .select({
      title: rhymePoems.poemTitle,
      slug: rhymePoems.poemSlug,
      meter: rhymePoems.meterName,
    })
    .from(rhymePoems)
    .where(eq(rhymePoems.rhymeSlug, slug))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(rhymeInfo[0].totalPoems / limit);

  return {
    rhymeDetails: {
      id: rhymeInfo[0].rhymeId,
      pattern: rhymeInfo[0].rhymePattern,
      poemsCount: rhymeInfo[0].totalPoems,
    },
    poems,
    totalPages,
  };
}
