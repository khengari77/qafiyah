import type { SelectOption } from '@/components/ui/select-option';
import {
  ERAS_OPTIONS,
  METERS_OPTIONS,
  RHYMES_OPTIONS,
  THEMES_OPTIONS,
} from '@/constants/search-options';
import { SEARCH_TEXTS } from '@/constants/search-texts';

export const searchTypeOptions = [
  { value: 'poems', label: SEARCH_TEXTS.poemsSearchTypeLabel },
  { value: 'poets', label: SEARCH_TEXTS.poetsSearchTypeLabel },
] as const satisfies readonly [SelectOption, SelectOption];

export const matchTypeOptions = [
  { value: 'all', label: SEARCH_TEXTS.matchTypeAll },
  { value: 'exact', label: SEARCH_TEXTS.matchTypeExact },
  { value: 'any', label: SEARCH_TEXTS.matchTypeAny },
] as const satisfies readonly SelectOption[];

export const erasOptions: readonly SelectOption[] = ERAS_OPTIONS.map((era) => ({
  value: era.id.toString(),
  label: era.name,
}));

export const rhymesOptions: readonly SelectOption[] = RHYMES_OPTIONS.map((rhyme) => ({
  value: rhyme.id.toString(),
  label: rhyme.name,
}));

export const metersOptions: readonly SelectOption[] = METERS_OPTIONS.map((meter) => ({
  value: meter.id.toString(),
  label: meter.name,
}));

export const themesOptions: readonly SelectOption[] = THEMES_OPTIONS.map((theme) => ({
  value: theme.id.toString(),
  label: theme.name,
}));
