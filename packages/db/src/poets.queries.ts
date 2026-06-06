import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { EraSlug, PoetSlug } from '@qafiyah/contracts';
import { and, eq, type SQL, sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asPoetSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { eraStats, poetStats } from './schema';

export type PoetStatsRow = {
  readonly name: string;
  readonly slug: PoetSlug;
  readonly poemsCount: number;
};

export type ListPoetsResult = {
  readonly poets: readonly PoetStatsRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListPoetsError = { readonly kind: 'sql_error'; readonly message: string };

// @NOTE: folding mirrors the @qafiyah/search Arabic analyzer so DB name search
// feels the same as ES: strip harakat (U+064B–U+0652), superscript alef (U+0670)
// and tatweel (U+0640), then fold alef forms→ا, ى→ي, ة→ه.
// q is matched literally (ILIKE metachars escaped in poetNameMatches).
const HARAKAT_RE = '[ً-ْٰـ]';
const FOLD_FROM = 'أإآٱىة'; // أ إ آ ٱ ى ة
const FOLD_TO = 'اااايه'; //  ا ا ا ا ي ه

function foldArabic(expr: SQL): SQL {
  return sql`translate(regexp_replace(${expr}, ${HARAKAT_RE}, '', 'g'), ${FOLD_FROM}, ${FOLD_TO})`;
}

function poetNameMatches(q: string): SQL {
  // Treat q as a literal substring: escape ILIKE metacharacters so %/_ from a
  // direct API caller can't act as wildcards. (Per search.ts, server-side input
  // is intentionally not Arabic-sanitized, so the DB must not assume it.)
  const literal = q.replace(/[\\%_]/g, (char) => `\\${char}`);
  return sql`${foldArabic(sql`${poetStats.name}`)} ILIKE '%' || ${foldArabic(sql`${literal}`)} || '%' ESCAPE '\\'`;
}

export async function listPoets(
  db: DbClient,
  page: number,
  opts?: { readonly eraSlug?: EraSlug; readonly q?: string }
): Promise<Result<ListPoetsResult, ListPoetsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;
  const eraWhere = opts?.eraSlug
    ? eq(
        poetStats.eraId,
        sql`(SELECT ${eraStats.id} FROM ${eraStats} WHERE ${eraStats.slug} = ${opts.eraSlug})`
      )
    : undefined;
  const nameWhere = opts?.q ? poetNameMatches(opts.q) : undefined;
  const where = and(eraWhere, nameWhere);

  const queryResult = await ResultAsync.fromPromise(
    Promise.all([
      db
        .select({
          name: poetStats.name,
          slug: poetStats.slug,
          poemsCount: poetStats.poemsCount,
        })
        .from(poetStats)
        .where(where)
        .limit(limit)
        .offset(offset),
      db.$count(poetStats, where),
    ]),
    (cause): ListPoetsError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const [poets, total] = queryResult.value;
  return ok({
    poets: poets.map((row) => ({ ...row, slug: asPoetSlug(row.slug) })),
    total,
    totalPages: Math.ceil(total / limit),
  });
}

const poetStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
});

export type GetPoetBySlugError =
  | { readonly kind: 'not_found'; readonly slug: PoetSlug }
  | ExecuteAsError;

export async function getPoetBySlug(
  db: DbClient,
  slug: PoetSlug
): Promise<Result<PoetStatsRow, GetPoetBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count FROM poet_stats WHERE slug = ${slug} LIMIT 1`,
    poetStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asPoetSlug(row.slug),
    poemsCount: Number(row.poems_count),
  });
}
