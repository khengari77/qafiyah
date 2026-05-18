import { SCHEMA_ORG_CONTEXT, SITE_URL } from '@/constants';

export type BreadcrumbItem = {
  readonly name: string;
  readonly path: string;
};

export function breadcrumbListJsonLd(
  items: readonly BreadcrumbItem[]
): Readonly<Record<string, unknown>> {
  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${SITE_URL}${item.path}`,
    })),
  };
}
