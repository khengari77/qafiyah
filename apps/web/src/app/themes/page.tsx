import type { Metadata } from 'next';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { SectionList } from '@/components/ui/section-list';
import { SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import { fetchThemes } from '@/lib/api/static';

export const metadata: Metadata = {
  title: 'قافية | تصفح حسب الأغراض',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ar_AR',
    url: `${SITE_URL}/themes`,
    title: 'قافية | تصفح حسب الأغراض',
    images: [
      {
        url: `${SITE_URL}${htmlHeadMetadata.openGraphUrl}`,
        width: 1200,
        height: 630,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    title: 'قافية | تصفح حسب الأغراض',
    images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
  },
};

export default async function ThemesPage() {
  const themes = await fetchThemes();

  const itemListElements = themes.map((theme, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Collection',
      name: theme.name,
      url: `${SITE_URL}/themes/${theme.slug}/page/1`,
      description: `قصائد ${theme.name} - ${toArabicDigits(theme.poemsCount)} قصيدة و ${toArabicDigits(theme.poetsCount)} شاعر`,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'الأغراض الشعرية',
    url: `${SITE_URL}/themes`,
    description: `قائمة بجميع الأغراض الشعرية في موقع قافية - ${toArabicDigits(themes.length)} غرض`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'قافية',
      url: SITE_URL,
    },
    numberOfItems: themes.length,
    itemListElement: itemListElements,
  };

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <SectionList
        title="الأغراض"
        dynamicTitle={`جميع الأغراض (${toArabicDigits(themes.length)} غرض)`}
      >
        {themes.length > 0 ? (
          themes.map(({ id, name, poemsCount, poetsCount, slug }) => (
            <ListCard
              key={id}
              name={name}
              href={`/themes/${slug}/page/1/`}
              title={`${toArabicDigits(poetsCount)} شاعر و${toArabicDigits(poemsCount)} قصيدة`}
            />
          ))
        ) : (
          <div className="text-red-500 text-center py-8">
            حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
          </div>
        )}
      </SectionList>
    </>
  );
}
