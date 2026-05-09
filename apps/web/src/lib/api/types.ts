import type {
  erasQueries,
  metersQueries,
  poemsQueries,
  poetsQueries,
  rhymesQueries,
  themesQueries,
} from '@qafiyah/db';

// Simple entity list types — derived from query function return types
export type Era = Awaited<ReturnType<typeof erasQueries.listEras>>[number];
export type Meter = Awaited<ReturnType<typeof metersQueries.listMeters>>[number];
export type Rhyme = Awaited<ReturnType<typeof rhymesQueries.listRhymes>>[number];
export type Theme = Awaited<ReturnType<typeof themesQueries.listThemes>>[number];

// Compound entity types — query return shapes (include totalPages used for pagination)
export type EraPoems = NonNullable<Awaited<ReturnType<typeof erasQueries.listEraPoems>>>;
export type MeterPoems = NonNullable<Awaited<ReturnType<typeof metersQueries.listMeterPoems>>>;
export type PoetPoems = NonNullable<Awaited<ReturnType<typeof poetsQueries.listPoetPoems>>>;
export type RhymePoems = NonNullable<Awaited<ReturnType<typeof rhymesQueries.listRhymePoems>>>;
export type ThemePoems = NonNullable<Awaited<ReturnType<typeof themesQueries.listThemePoems>>>;

// Poets list data
type ListPoetsResult = Awaited<ReturnType<typeof poetsQueries.listPoets>>;
export type PoetsData = Pick<ListPoetsResult, 'poets'>;

// Poem response types — derived from getPoemBySlug's found result
type GetPoemFound = Extract<
  Awaited<ReturnType<typeof poemsQueries.getPoemBySlug>>,
  { type: 'found' }
>;
export type PoemResponseData = GetPoemFound['data'];
export type PoemMetadata = PoemResponseData['metadata'];
export type ProcessedPoemContent = PoemResponseData['processedContent'];
export type RelatedPoems = PoemResponseData['relatedPoems'][number];

// Pagination meta used in static fetch functions
export type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalItems?: number;
};

// Search result types — manually defined (come from raw SQL execution)
export type PoemsSearchResult = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poem_title: string;
  poem_snippet: string;
  poem_meter: string;
  poem_slug: string;
  relevance: number;
  total_count: number;
};

export type PoetsSearchResult = {
  poet_name: string;
  poet_era: string;
  poet_slug: string;
  poet_bio: string;
  relevance: number;
  total_count: number;
};

export type SearchPagination = {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PoemsSearchResponseData = {
  results: PoemsSearchResult[];
  pagination: SearchPagination;
};

export type PoetsSearchResponseData = {
  results: PoetsSearchResult[];
  pagination: SearchPagination;
};
