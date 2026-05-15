import { oc } from '@orpc/contract';
import {
  listResponse,
  listResponseWithMeta,
  parentMeta,
  poemListItem,
  slugAndPageInput,
  statRowNoPoetsCount,
} from './_shared';

const listThemesContract = oc
  .route({ method: 'GET', path: '/themes' })
  .output(listResponse(statRowNoPoetsCount));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/poems' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(listResponseWithMeta(poemListItem, parentMeta));

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
