import { pub } from './contracts/_base';
import { listEraPoems, listEras } from './contracts/eras.contract';
import { listMeterPoems, listMeters } from './contracts/meters.contract';
import { getBySlug, listAllSlugs, listSlugs } from './contracts/poems.contract';
import { getPoetBySlug, listPoetPoems, listPoets } from './contracts/poets.contract';
import { listRhymePoems, listRhymes } from './contracts/rhymes.contract';
import { search } from './contracts/search.contract';
import { listThemePoems, listThemes } from './contracts/themes.contract';

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
