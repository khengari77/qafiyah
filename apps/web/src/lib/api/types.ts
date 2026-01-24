import type {
  eraPoemsResponseSchema,
  eraSchema,
  meterPoemsResponseSchema,
  meterSchema,
  paginationMetaSchema,
  poemMetadataSchema,
  poemsSearchResultSchema,
  poetPoemsResponseSchema,
  poetsListResponseSchema,
  processedPoemContentSchema,
  relatedPoemSchema,
  rhymePoemsResponseSchema,
  rhymeSchema,
  themePoemsResponseSchema,
  themeSchema,
  z,
} from '@qaf/zod-schemas';
import type { poetsSearchResultSchema } from './../../../node_modules/@qaf/zod-schemas/src/schemas/search.schema';

export type PaginationMeta = z.infer<typeof paginationMetaSchema>['pagination'];

export type Era = z.infer<typeof eraSchema>;
export type Meter = z.infer<typeof meterSchema>;
export type Rhyme = z.infer<typeof rhymeSchema>;
export type Theme = z.infer<typeof themeSchema>;

export type PoemMetadata = z.infer<typeof poemMetadataSchema>;
export type ProcessedPoemContent = z.infer<typeof processedPoemContentSchema>;
export type RelatedPoems = z.infer<typeof relatedPoemSchema>;

export type PoemResponseData = {
  metadata: PoemMetadata;
  clearTitle: string;
  processedContent: ProcessedPoemContent;
  relatedPoems: RelatedPoems;
};

export type EraResponseData = z.infer<typeof eraPoemsResponseSchema>['data'];
export type MeterResponseData = z.infer<typeof meterPoemsResponseSchema>['data'];
export type PoetResponseData = z.infer<typeof poetPoemsResponseSchema>['data'];
export type RhymeResponseData = z.infer<typeof rhymePoemsResponseSchema>['data'];
export type ThemeResponseData = z.infer<typeof themePoemsResponseSchema>['data'];
export type PoetsData = z.infer<typeof poetsListResponseSchema>['data'];

export type EraPoems = EraResponseData;
export type MeterPoems = MeterResponseData;
export type PoetPoems = PoetResponseData;
export type RhymePoems = RhymeResponseData;
export type ThemePoems = ThemeResponseData;

export type PoemsSearchResult = z.infer<typeof poemsSearchResultSchema>;

export type PoetsSearchResult = z.infer<typeof poetsSearchResultSchema>;

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
