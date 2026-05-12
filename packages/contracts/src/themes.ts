import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { poemListItem, slugAndPageInput, statRow } from './_shared';

const listThemesContract = oc.route({ method: 'GET', path: '/themes' }).output(v.array(statRow));

const listThemePoemsContract = oc
  .route({ method: 'GET', path: '/themes/{slug}/page/{page}' })
  .input(slugAndPageInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Theme not found' },
  })
  .output(
    v.object({
      themeDetails: v.object({
        id: v.number(),
        name: v.string(),
        poemsCount: v.number(),
      }),
      poems: v.array(poemListItem),
      totalPages: v.number(),
    })
  );

export const themesContract = {
  list: listThemesContract,
  listPoems: listThemePoemsContract,
};
