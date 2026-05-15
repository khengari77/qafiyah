import {
  ERAS_OPTIONS,
  METERS_OPTIONS,
  RHYMES_OPTIONS,
  SEARCH_TEXTS,
  THEMES_OPTIONS,
} from '@qafiyah/constants';

type SelectOption = { value: string; label: string };

export const searchTypeOptions: [SelectOption, SelectOption] = [
  { value: 'poems', label: SEARCH_TEXTS.poemsSearchTypeLabel },
  { value: 'poets', label: SEARCH_TEXTS.poetsSearchTypeLabel },
];

export const matchTypeOptions: SelectOption[] = [
  { value: 'all', label: SEARCH_TEXTS.matchTypeAll },
  { value: 'exact', label: SEARCH_TEXTS.matchTypeExact },
  { value: 'any', label: SEARCH_TEXTS.matchTypeAny },
];

export const erasOptions: SelectOption[] = ERAS_OPTIONS.map((era) => ({
  value: era.id.toString(),
  label: era.name,
}));

export const rhymesOptions: SelectOption[] = RHYMES_OPTIONS.map((rhyme) => ({
  value: rhyme.id.toString(),
  label: rhyme.name,
}));

export const metersOptions: SelectOption[] = METERS_OPTIONS.map((meter) => ({
  value: meter.id.toString(),
  label: meter.name,
}));

export const themesOptions: SelectOption[] = THEMES_OPTIONS.map((theme) => ({
  value: theme.id.toString(),
  label: theme.name,
}));
