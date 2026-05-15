import type { poemsQueries, searchQueries } from '@qafiyah/db';

type PoemRow = {
  title: string;
  slug: string;
  poetName: string;
  poetSlug: string;
  meterName: string;
  meterSlug: string;
};

type SubRef = { name: string; slug: string };

type PoemListItem = {
  title: string;
  slug: string;
  poet: SubRef;
  meter: SubRef;
};

export function toPoemListItem(row: PoemRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  };
}

type PoemResource = {
  title: string;
  slug: string;
  verses: [string, string][];
  verseCount: number;
  sample: string;
  keywords: string;
  poet: SubRef;
  era: SubRef;
  meter: SubRef;
  theme: SubRef;
  relatedPoems: PoemListItem[];
};

export function toPoemResource(slug: string, data: poemsQueries.PoemResourceData): PoemResource {
  return {
    title: data.clearTitle,
    slug,
    verses: data.processedContent.verses,
    verseCount: data.processedContent.verseCount,
    sample: data.processedContent.sample,
    keywords: data.processedContent.keywords,
    poet: { name: data.metadata.poetName, slug: data.metadata.poetSlug },
    era: { name: data.metadata.eraName, slug: data.metadata.eraSlug },
    meter: { name: data.metadata.meterName, slug: data.metadata.meterSlug },
    theme: { name: data.metadata.themeName, slug: data.metadata.themeSlug },
    relatedPoems: data.relatedPoems.map(toPoemListItem),
  };
}

type PoemSearchResult = {
  type: 'poem';
  title: string;
  slug: string;
  snippet: string;
  poet: SubRef;
  meter: SubRef;
  era: SubRef;
  relevance: number;
};

export function toPoemSearchResult(row: searchQueries.PoemsSearchRow): PoemSearchResult {
  return {
    type: 'poem',
    title: row.poemTitle,
    slug: row.poemSlug,
    snippet: row.poemSnippet,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.poemMeter, slug: row.poemMeterSlug },
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}

type PoetSearchResult = {
  type: 'poet';
  name: string;
  slug: string;
  bio: string;
  era: SubRef;
  relevance: number;
};

export function toPoetSearchResult(row: searchQueries.PoetsSearchRow): PoetSearchResult {
  return {
    type: 'poet',
    name: row.poetName,
    slug: row.poetSlug,
    bio: row.poetBio,
    era: { name: row.poetEra, slug: row.poetEraSlug },
    relevance: row.relevance,
  };
}
