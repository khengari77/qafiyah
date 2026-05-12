import { pub } from './procedures/_base';
import { listEraPoems, listEras } from './procedures/eras.procedures';
import { listMeterPoems, listMeters } from './procedures/meters.procedures';
import { getBySlug, listAllSlugs, listSlugs } from './procedures/poems.procedures';
import { getPoetBySlug, listPoetPoems, listPoets } from './procedures/poets.procedures';
import { listRhymePoems, listRhymes } from './procedures/rhymes.procedures';
import { search } from './procedures/search.procedures';
import { listThemePoems, listThemes } from './procedures/themes.procedures';

export const router = pub.router({
  eras: {
    list: listEras,
    listPoems: listEraPoems,
  },
  meters: {
    list: listMeters,
    listPoems: listMeterPoems,
  },
  poems: {
    listSlugs,
    listAllSlugs,
    getBySlug,
  },
  poets: {
    list: listPoets,
    getBySlug: getPoetBySlug,
    listPoems: listPoetPoems,
  },
  rhymes: {
    list: listRhymes,
    listPoems: listRhymePoems,
  },
  themes: {
    list: listThemes,
    listPoems: listThemePoems,
  },
  search: {
    search,
  },
});
