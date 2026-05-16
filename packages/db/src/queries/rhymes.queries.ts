import { ARABIC_LETTERS_MAP, POEMS_PER_PAGE } from '@qafiyah/constants';
import type { RhymeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { rhymeStats } from '../schema';
import { asRhymeSlug } from '../utils/brand';
import { executeAs } from '../utils/execute-as';
import { normalizeRhymePattern } from '../utils/normalize-rhyme-pattern';
import { parentRowSchema, rawPoemRowSchema } from './_row-schemas';
import type { PoemListRow } from './eras.queries';

export type RhymeLetterGroup = {
  readonly name: string;
  readonly slug: RhymeSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListRhymePoemsResult = {
  readonly parent: { readonly name: string; readonly slug: RhymeSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export async function listRhymes(db: DbClient): Promise<readonly RhymeLetterGroup[]> {
  const results = await db.select().from(rhymeStats);

  // @WARN: groupedRhymes is intentionally mutable, letters are accumulated across
  //   iterations of the result loop before being projected into the readonly output.
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

  const enrichedGroups: readonly RhymeLetterGroup[] = Array.from(groupedRhymes.entries()).map(
    ([letter, { rhymes, totalPoemsCount, totalPoetsCount }]) => {
      const firstRhyme = rhymes[0];
      if (!firstRhyme) throw new Error('listRhymes: no first rhyme for letter');
      return {
        name: letter,
        slug: asRhymeSlug(firstRhyme.slug),
        poemsCount: totalPoemsCount,
        poetsCount: totalPoetsCount,
      };
    }
  );

  return [...enrichedGroups].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listRhymePoems(
  db: DbClient,
  slug: RhymeSlug,
  page: number
): Promise<ListRhymePoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT pattern AS name, poems_count FROM rhyme_stats WHERE slug = ${slug}::UUID LIMIT 1`,
    parentRowSchema
  );

  if (parentRows.length === 0 || !parentRows[0]) return null;

  const total = Number(parentRows[0].poems_count);

  const rawPoems = await executeAs(
    db,
    sql`
      SELECT
        p.title AS title,
        p.slug::TEXT AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.rhymes r ON p.rhyme_id = r.id
      WHERE r.slug = ${slug}::UUID
      ORDER BY p.id
      LIMIT ${limit} OFFSET ${offset}
    `,
    rawPoemRowSchema
  );

  const poems: readonly PoemListRow[] = rawPoems.map((r) => ({
    title: r.title,
    slug: r.slug,
    poetName: r.poet_name,
    poetSlug: r.poet_slug,
    meterName: r.meter_name,
    meterSlug: r.meter_slug,
  }));

  return {
    parent: { name: parentRows[0].name, slug, poemsCount: total },
    poems,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
