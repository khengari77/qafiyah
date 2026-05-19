import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { RhymeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { asRhymeSlug } from './brand';
import type { DbClient } from './client';
import { ARABIC_LETTERS_MAP } from './constants';
import { type ExecuteAsError, executeAs } from './execute-as';
import { type PoemListRow, parentScopedPoemRowSchema, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { rhymeStats } from './schema';

const PARENS_REGEX = /[()]/g;
const ARABIC_AL_PREFIX_REGEX = /^ال/;

export function normalizeRhymePattern(pattern: string): string {
  return pattern.replace(PARENS_REGEX, '').replace(ARABIC_AL_PREFIX_REGEX, '').trim();
}

export type RhymeLetterStatsRow = {
  readonly name: string;
  readonly slug: RhymeSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListRhymesError =
  | { readonly kind: 'sql_error'; readonly message: string }
  | { readonly kind: 'empty_letter_group'; readonly letter: string };

export type ListRhymePoemsResult = {
  readonly parent: { readonly name: string; readonly slug: RhymeSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListRhymePoemsError =
  | { readonly kind: 'not_found'; readonly slug: RhymeSlug }
  | ExecuteAsError;

export async function listRhymes(
  db: DbClient
): Promise<Result<readonly RhymeLetterStatsRow[], ListRhymesError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.select().from(rhymeStats),
    (cause): ListRhymesError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const results = queryResult.value;

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

  const enrichedGroups: RhymeLetterStatsRow[] = [];
  for (const [letter, { rhymes, totalPoemsCount, totalPoetsCount }] of groupedRhymes.entries()) {
    const firstRhyme = rhymes[0];
    if (!firstRhyme) return err({ kind: 'empty_letter_group', letter });
    enrichedGroups.push({
      name: letter,
      slug: asRhymeSlug(firstRhyme.slug),
      poemsCount: totalPoemsCount,
      poetsCount: totalPoetsCount,
    });
  }

  return ok(enrichedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar')));
}

export async function listRhymePoems(
  db: DbClient,
  slug: RhymeSlug,
  page: number
): Promise<Result<ListRhymePoemsResult, ListRhymePoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRowsResult = await executeAs(
    db,
    sql`SELECT pattern AS name, poems_count FROM rhyme_stats WHERE slug = ${slug}::UUID LIMIT 1`,
    parentStatsRowSchema
  );
  if (parentRowsResult.isErr()) return err(parentRowsResult.error);
  const parentRows = parentRowsResult.value;

  if (parentRows.length === 0 || !parentRows[0]) return err({ kind: 'not_found', slug });

  const total = Number(parentRows[0].poems_count);

  const rawPoemsResult = await executeAs(
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
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const poems: readonly PoemListRow[] = rawPoemsResult.value.map((row) => ({
    title: row.title,
    slug: row.slug,
    poetName: row.poet_name,
    poetSlug: row.poet_slug,
    meterName: row.meter_name,
    meterSlug: row.meter_slug,
  }));

  return ok({
    parent: { name: parentRows[0].name, slug, poemsCount: total },
    poems,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export type ListAllRhymePoemsError = ExecuteAsError;

export async function listAllRhymePoems(
  db: DbClient
): Promise<Result<ReadonlyMap<RhymeSlug, readonly PoemListRow[]>, ListAllRhymePoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        r.slug::TEXT AS parent_slug,
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
      ORDER BY r.slug, p.id
    `,
    parentScopedPoemRowSchema
  );
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const grouped = new Map<RhymeSlug, PoemListRow[]>();
  for (const row of rawPoemsResult.value) {
    const rhymeSlug = asRhymeSlug(row.parent_slug);
    const list = grouped.get(rhymeSlug);
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    };
    if (list) list.push(entry);
    else grouped.set(rhymeSlug, [entry]);
  }
  return ok(grouped);
}
