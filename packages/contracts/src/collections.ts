import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { collectionSlugSchema } from './brands';
import {
  EXAMPLE_COLLECTION_SLUG,
  inputValidationErrorMap,
  internalServerErrorMap,
} from './constants';
import { listResponse, slugInput, slugWithPoemCount } from './schemas';

const collectionEntry = slugWithPoemCount(collectionSlugSchema);

const listContract = oc
  .route({ method: 'GET', path: '/collections' })
  .errors({ ...internalServerErrorMap })
  .output(listResponse(collectionEntry));

const getContract = oc
  .route({ method: 'GET', path: '/collections/{slug}' })
  .input(slugInput(collectionSlugSchema, EXAMPLE_COLLECTION_SLUG))
  .errors({
    ...inputValidationErrorMap,
    ...internalServerErrorMap,
    NOT_FOUND: { status: 404, message: 'Collection not found' },
  })
  .output(v.object({ data: collectionEntry }));

export const collectionsContract = {
  list: listContract,
  get: getContract,
};
