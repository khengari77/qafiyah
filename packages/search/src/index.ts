export {
  type AdminError,
  bulkIndex,
  diffKeys,
  ensureIndex,
  indexHealth,
  listIndicesForAlias,
  nextIndexName,
  type ReconcileConfig,
  reconcileFromSource,
  type ReindexConfig,
  reindexFromSource,
  swapAlias,
  toBulkOperations,
} from './admin';
export {
  type CreateSearchClientError,
  createSearchClient,
  type SearchClient,
} from './client';
export {
  docHash,
  type PoemDoc,
  type PoemSource,
  type PoetDoc,
  type PoetSource,
  toPoemDoc,
  toPoetDoc,
} from './documents';
export { POEMS_INDEX_BODY, POETS_INDEX_BODY } from './indices';
export { buildPoemSearchBody, buildPoetSearchBody } from './query';
export {
  type PoemHit,
  type PoetHit,
  type SearchPage,
  type SearchRunError,
  searchPoems,
  searchPoets,
} from './search';
