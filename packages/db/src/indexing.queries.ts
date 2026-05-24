import type { PoemSource, PoetSource } from '@qafiyah/search';
import { sql } from 'drizzle-orm';
import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';

const poemRowSchema = v.object({
  id: v.number(),
  slug: v.string(),
  title: v.string(),
  content: v.string(),
  poet_name: v.string(),
  poet_slug: v.string(),
  era_name: v.string(),
  era_slug: v.string(),
  meter_name: v.string(),
  meter_slug: v.string(),
  theme_slug: v.string(),
  rhyme_slug: v.string(),
  collection_slug: v.string(),
});

const poetRowSchema = v.object({
  id: v.number(),
  slug: v.string(),
  name: v.string(),
  era_name: v.string(),
  era_slug: v.string(),
});

function formatPgTextArrayLiteral(values: readonly string[]): string {
  const escaped = values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

function toPoemSource(row: v.InferOutput<typeof poemRowSchema>): PoemSource {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    poetName: row.poet_name,
    poetSlug: row.poet_slug,
    eraName: row.era_name,
    eraSlug: row.era_slug,
    meterName: row.meter_name,
    meterSlug: row.meter_slug,
    themeSlug: row.theme_slug,
    rhymeSlug: row.rhyme_slug,
    collectionSlug: row.collection_slug,
  };
}

function toPoetSource(row: v.InferOutput<typeof poetRowSchema>): PoetSource {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    eraName: row.era_name,
    eraSlug: row.era_slug,
  };
}

const POEM_SELECT = sql`
  SELECT
    p.id AS id, p.slug AS slug, p.title AS title, p.content AS content,
    pt.name AS poet_name, pt.slug AS poet_slug,
    e.name AS era_name, e.slug AS era_slug,
    m.name AS meter_name, m.slug AS meter_slug,
    COALESCE(t.slug, '') AS theme_slug,
    COALESCE(r.slug, '') AS rhyme_slug,
    COALESCE(c.slug, '') AS collection_slug
  FROM public.poems p
  JOIN public.poets pt ON p.poet_id = pt.id
  JOIN public.eras e ON pt.era_id = e.id
  JOIN public.meters m ON p.meter_id = m.id
  LEFT JOIN public.themes t ON p.theme_id = t.id
  LEFT JOIN public.rhymes r ON p.rhyme_id = r.id
  LEFT JOIN public.collections c ON p.collection_id = c.id
`;

// Keyset-paged batch for full reindex + reconcile hashing.
export async function streamPoemBatch(
  db: DbClient,
  afterId: number,
  limit: number
): Promise<Result<readonly PoemSource[], ExecuteAsError>> {
  const rows = await executeAs(
    db,
    sql`${POEM_SELECT} WHERE p.id > ${afterId} ORDER BY p.id ASC LIMIT ${limit}`,
    poemRowSchema
  );
  if (rows.isErr()) return err(rows.error);
  return ok(rows.value.map(toPoemSource));
}

export async function streamPoetBatch(
  db: DbClient,
  afterId: number,
  limit: number
): Promise<Result<readonly PoetSource[], ExecuteAsError>> {
  const rows = await executeAs(
    db,
    sql`
      SELECT pt.id AS id, pt.slug AS slug, pt.name AS name,
             e.name AS era_name, e.slug AS era_slug
      FROM public.poets pt
      JOIN public.eras e ON pt.era_id = e.id
      WHERE pt.id > ${afterId} ORDER BY pt.id ASC LIMIT ${limit}
    `,
    poetRowSchema
  );
  if (rows.isErr()) return err(rows.error);
  return ok(rows.value.map(toPoetSource));
}

// Fetch full source rows for a specific set of slugs (reconcile upserts).
export async function getPoemsBySlugs(
  db: DbClient,
  slugs: readonly string[]
): Promise<Result<readonly PoemSource[], ExecuteAsError>> {
  if (slugs.length === 0) return ok([]);
  const literal = formatPgTextArrayLiteral(slugs);
  const rows = await executeAs(
    db,
    sql`${POEM_SELECT} WHERE p.slug = ANY(${literal}::text[])`,
    poemRowSchema
  );
  if (rows.isErr()) return err(rows.error);
  return ok(rows.value.map(toPoemSource));
}

export async function getPoetsBySlugs(
  db: DbClient,
  slugs: readonly string[]
): Promise<Result<readonly PoetSource[], ExecuteAsError>> {
  if (slugs.length === 0) return ok([]);
  const literal = formatPgTextArrayLiteral(slugs);
  const rows = await executeAs(
    db,
    sql`
      SELECT pt.id AS id, pt.slug AS slug, pt.name AS name,
             e.name AS era_name, e.slug AS era_slug
      FROM public.poets pt JOIN public.eras e ON pt.era_id = e.id
      WHERE pt.slug = ANY(${literal}::text[])
    `,
    poetRowSchema
  );
  if (rows.isErr()) return err(rows.error);
  return ok(rows.value.map(toPoetSource));
}
