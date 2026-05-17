import type { SearchOption } from './types';

export const ERAS_OPTIONS = [
  { id: 1, name: 'إسلامي' },
  { id: 2, name: 'عباسي' },
  { id: 3, name: 'متأخر' },
  { id: 4, name: 'أموي' },
  { id: 5, name: 'جاهلي' },
  { id: 6, name: 'مخضرم' },
  { id: 7, name: 'أندلسي' },
  { id: 8, name: 'مملوكي' },
  { id: 9, name: 'عثماني' },
  { id: 10, name: 'أيوبي' },
] as const satisfies readonly SearchOption[];
