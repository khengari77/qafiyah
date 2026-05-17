export type NavLink = {
  readonly name: string;
  readonly href: string;
  readonly external: boolean;
};

export const NAV_LINKS = [
  { name: 'الرئيسة', href: '/', external: false },
  { name: 'الشعراء', href: '/poets/page/1', external: false },
  { name: 'العصور', href: '/eras', external: false },
  { name: 'البحور', href: '/meters', external: false },
  { name: 'القوافي', href: '/rhymes', external: false },
  { name: 'الأغراض', href: '/themes', external: false },
] as const satisfies readonly NavLink[];
