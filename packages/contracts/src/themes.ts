import { oc } from '@orpc/contract';
import * as v from 'valibot';

import { paginationFields, poemListItem, slugAndPageInput, statRowNoPoetsCount } from './_shared';

const listThemesContract = oc.route({ method: 'GET', path: '/themes' }).output(
  v.object({
    themes: v.array(statRowNoPoetsCount),
    ...paginationFields,
  })
);

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(
    v.object({
      themeDetails: v.object({
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItem),
      ...paginationFields,
    })
  );

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
