import type { ApiOutputs } from './rpc';

export type Era = ApiOutputs['eras']['list'][number];
export type Meter = ApiOutputs['meters']['list'][number];
export type Rhyme = ApiOutputs['rhymes']['list'][number];
export type Theme = ApiOutputs['themes']['list'][number];

export type EraPoems = ApiOutputs['eras']['listPoems'];
export type MeterPoems = ApiOutputs['meters']['listPoems'];
export type PoetPoems = ApiOutputs['poets']['listPoems'];
export type RhymePoems = ApiOutputs['rhymes']['listPoems'];
export type ThemePoems = ApiOutputs['themes']['listPoems'];

export type PoetsData = Pick<ApiOutputs['poets']['list'], 'poets'>;

export type PoemResponseData = ApiOutputs['poems']['getBySlug'];
export type PoemMetadata = PoemResponseData['metadata'];
export type RelatedPoems = PoemResponseData['relatedPoems'][number];

export type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalItems?: number;
};

type SearchResponse = ApiOutputs['search']['search'];
export type PoemsSearchResponseData = Extract<SearchResponse, { search_type: 'poems' }>;
export type PoetsSearchResponseData = Extract<SearchResponse, { search_type: 'poets' }>;
export type PoemsSearchResult = PoemsSearchResponseData['results'][number];
export type PoetsSearchResult = PoetsSearchResponseData['results'][number];
export type SearchPagination = PoemsSearchResponseData['pagination'];
