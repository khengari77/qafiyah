import { type SQL, sql } from 'drizzle-orm';
import type { DbClient } from '../client';

export type PoemsSearchRow = {
  poetName: string;
  poetEra: string;
  poetSlug: string;
  poemTitle: string;
  poemSnippet: string;
  poemMeter: string;
  poemSlug: string;
  relevance: number;
};

export type PoetsSearchRow = {
  poetName: string;
  poetEra: string;
  poetSlug: string;
  poetBio: string;
  relevance: number;
};

export type SearchPage<T> = {
  rows: T[];
  totalCount: number;
};

type RawPoemsSearchRow = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poem_title: string;
  poem_snippet: string;
  poem_meter: string;
  poem_slug: string;
  relevance: number;
  total_count: number | string;
};

type RawPoetsSearchRow = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poet_bio: string;
  relevance: number;
  total_count: number | string;
};

function intArrayParam(ids: number[] | null): SQL {
  if (!ids || ids.length === 0) return sql`NULL::INTEGER[]`;
  return sql`${`{${ids.join(',')}}`}::INTEGER[]`;
}

export async function searchPoems(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  meterIds: number[] | null,
  eraIds: number[] | null,
  themeIds: number[] | null,
  rhymeIds: number[] | null
): Promise<SearchPage<PoemsSearchRow>> {
  const raw = (await db.execute(
    sql`SELECT * FROM search_poems(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${intArrayParam(meterIds)},
      ${intArrayParam(eraIds)},
      ${intArrayParam(themeIds)},
      ${intArrayParam(rhymeIds)}
    )`
  )) as unknown as RawPoemsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const totalCount = Number(raw[0]?.total_count ?? 0);
  const rows: PoemsSearchRow[] = raw.map((r) => ({
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetSlug: r.poet_slug,
    poemTitle: r.poem_title,
    poemSnippet: r.poem_snippet,
    poemMeter: r.poem_meter,
    poemSlug: r.poem_slug,
    relevance: r.relevance,
  }));
  return { rows, totalCount };
}

export async function searchPoets(
  db: DbClient,
  query: string,
  page: number,
  matchType: string,
  eraIds: number[] | null
): Promise<SearchPage<PoetsSearchRow>> {
  const raw = (await db.execute(
    sql`SELECT * FROM search_poets(
      ${query}::TEXT,
      ${page}::INTEGER,
      ${matchType}::TEXT,
      ${intArrayParam(eraIds)}
    )`
  )) as unknown as RawPoetsSearchRow[];

  if (!raw || raw.length === 0) return { rows: [], totalCount: 0 };

  const totalCount = Number(raw[0]?.total_count ?? 0);
  const rows: PoetsSearchRow[] = raw.map((r) => ({
    poetName: r.poet_name,
    poetEra: r.poet_era,
    poetSlug: r.poet_slug,
    poetBio: r.poet_bio,
    relevance: r.relevance,
  }));
  return { rows, totalCount };
}
