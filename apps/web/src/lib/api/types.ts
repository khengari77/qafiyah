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
  poetsSearchResultSchema,
  processedPoemContentSchema,
  relatedPoemSchema,
  rhymePoemsResponseSchema,
  rhymeSchema,
  themePoemsResponseSchema,
  themeSchema,
  z,
} from '@qafiyah/schemas';

export type PaginationMeta = z.infer<typeof paginationMetaSchema>['pagination'];

/**
 * Era (time period) entity with id, name, slug, and poem count
 */
export type Era = z.infer<typeof eraSchema>;

/**
 * Meter (poetic meter/bahr) entity with id, name, slug, and poem count
 */
export type Meter = z.infer<typeof meterSchema>;

/**
 * Rhyme (qafiyah) entity with id, name/pattern, slug, and poem count
 */
export type Rhyme = z.infer<typeof rhymeSchema>;

/**
 * Theme (gharad/purpose) entity with id, name, slug, and poem count
 */
export type Theme = z.infer<typeof themeSchema>;

export type PoemMetadata = z.infer<typeof poemMetadataSchema>;
export type ProcessedPoemContent = z.infer<typeof processedPoemContentSchema>;
export type RelatedPoems = z.infer<typeof relatedPoemSchema>;

export type PoemResponseData = {
  metadata: PoemMetadata;
  clearTitle: string;
  processedContent: ProcessedPoemContent;
  relatedPoems: RelatedPoems[];
};

/**
 * Response data for era poems page: contains era details and poems list
 */
export type EraResponseData = z.infer<typeof eraPoemsResponseSchema>['data'];

/**
 * Response data for meter poems page: contains meter details and poems list
 */
export type MeterResponseData = z.infer<typeof meterPoemsResponseSchema>['data'];

/**
 * Response data for poet poems page: contains poet details and poems list
 */
export type PoetResponseData = z.infer<typeof poetPoemsResponseSchema>['data'];

/**
 * Response data for rhyme poems page: contains rhyme details and poems list
 */
export type RhymeResponseData = z.infer<typeof rhymePoemsResponseSchema>['data'];

/**
 * Response data for theme poems page: contains theme details and poems list
 */
export type ThemeResponseData = z.infer<typeof themePoemsResponseSchema>['data'];

/**
 * Response data for poets list page: contains list of poets
 */
export type PoetsData = z.infer<typeof poetsListResponseSchema>['data'];

// Type aliases for consistency
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
