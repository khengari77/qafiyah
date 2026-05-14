import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { ARABIC_LETTERS_MAP, FETCH_PER_PAGE } from '../constants';
import { rhymePoems, rhymeStats } from '../schema';
import { normalizeRhymePattern } from '../utils/normalize-rhyme-pattern';

export type RhymeLetterGroup = {
  name: string;
  slug: string;
  poemsCount: number;
};

export type ListRhymePoemsResult = {
  rhymeDetails: { pattern: string; poemsCount: number };
  poems: { title: string; slug: string; meter: string }[];
  total: number;
  totalPages: number;
};

export async function listRhymes(db: DbClient): Promise<RhymeLetterGroup[]> {
  const results = await db.select().from(rhymeStats);

  const groupedRhymes = new Map<string, { rhymes: typeof results; totalPoemsCount: number }>();

  for (const rhyme of results) {
    const cleanPattern = normalizeRhymePattern(rhyme.pattern);

    for (const [letterName, variants] of ARABIC_LETTERS_MAP.entries()) {
      if (variants.includes(cleanPattern)) {
        let group = groupedRhymes.get(letterName);
        if (!group) {
          group = { rhymes: [], totalPoemsCount: 0 };
          groupedRhymes.set(letterName, group);
        }
        group.rhymes.push(rhyme);
        group.totalPoemsCount += rhyme.poemsCount;
        break;
      }
    }
  }

  const enrichedGroups = Array.from(groupedRhymes.entries()).map(
    ([letter, { rhymes, totalPoemsCount }]) => {
      const firstRhyme = rhymes[0];
      if (!firstRhyme) throw new Error();
      return {
        name: letter,
        slug: firstRhyme.slug,
        poemsCount: totalPoemsCount,
      };
    }
  );

  return enrichedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listRhymePoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListRhymePoemsResult | null> {
  const limit = FETCH_PER_PAGE;
  const offset = (page - 1) * limit;

  const [rhymeInfo, poems] = await Promise.all([
    db
      .select({
        rhymePattern: rhymePoems.rhymePattern,
        totalPoems: rhymePoems.totalPoemsByRhyme,
      })
      .from(rhymePoems)
      .where(eq(rhymePoems.rhymeSlug, slug))
      .limit(1),
    db
      .select({
        title: rhymePoems.poemTitle,
        slug: rhymePoems.poemSlug,
        meter: rhymePoems.meterName,
      })
      .from(rhymePoems)
      .where(eq(rhymePoems.rhymeSlug, slug))
      .limit(limit)
      .offset(offset),
  ]);

  if (!rhymeInfo.length || !rhymeInfo[0]) return null;

  const total = rhymeInfo[0].totalPoems;
  const totalPages = Math.ceil(total / limit);

  return {
    rhymeDetails: {
      pattern: rhymeInfo[0].rhymePattern,
      poemsCount: total,
    },
    poems,
    total,
    totalPages,
  };
}
