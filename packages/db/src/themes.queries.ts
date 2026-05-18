import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { ThemeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { asThemeSlug } from './brand';
import type { DbClient } from './client';
import { executeAs } from './execute-as';
import { type PoemListRow, parentRowSchema, rawPoemRowSchema } from './row-schemas';
import { themeStats } from './schema';

export type ThemeStatsRow = {
  readonly name: string;
  readonly slug: ThemeSlug;
  readonly poemsCount: number;
};

export type ListThemePoemsResult = {
  readonly parent: { readonly name: string; readonly slug: ThemeSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export async function listThemes(db: DbClient): Promise<readonly ThemeStatsRow[]> {
  const results = await db
    .select({
      name: themeStats.name,
      slug: themeStats.slug,
      poemsCount: themeStats.poemsCount,
    })
    .from(themeStats);
  return results
    .map((r) => ({ ...r, slug: asThemeSlug(r.slug) }))
    .sort((a, b) => b.poemsCount - a.poemsCount);
}

export async function listThemePoems(
  db: DbClient,
  slug: ThemeSlug,
  page: number
): Promise<ListThemePoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM theme_stats WHERE slug = ${slug}::UUID LIMIT 1`,
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
      JOIN public.themes th ON p.theme_id = th.id
      WHERE th.slug = ${slug}::UUID
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
