import { oc } from '@orpc/contract';
import { collectionSlugSchema } from './brands';
import {
  EXAMPLE_COLLECTION_SLUG,
  inputValidationErrorMap,
  internalServerErrorMap,
} from './constants';
import {
  listResponse,
  listResponseWithMeta,
  poemListItem,
  slugAndPageInput,
  slugWithPoemCount,
} from './schemas';

const listCollectionsContract = oc
  .route({ method: 'GET', path: '/collections' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(slugWithPoemCount(collectionSlugSchema)));

const listCollectionPoemsContract = oc
  .route({ method: 'GET', path: '/collections/{slug}/poems' })
  .input(slugAndPageInput(collectionSlugSchema, EXAMPLE_COLLECTION_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Collection not found' },
  })
  .output(listResponseWithMeta(poemListItem, slugWithPoemCount(collectionSlugSchema)));

export const collectionsContract = {
  list: listCollectionsContract,
  listPoems: listCollectionPoemsContract,
};
