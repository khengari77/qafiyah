import type { Metadata } from 'next';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { SectionList } from '@/components/ui/section-list';
import { SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import { fetchRhymes } from '@/lib/api/static';

export const metadata: Metadata = {
  title: 'قافية | تصفح حسب القوافي',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ar_AR',
    url: `${SITE_URL}/rhymes`,
    title: 'قافية | تصفح حسب القوافي',
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
    title: 'قافية | تصفح حسب القوافي',
    images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
  },
};

export default async function RhymesPage() {
  const rhymes = await fetchRhymes();

  const itemListElements = rhymes.map((rhyme, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Collection',
      name: rhyme.name,
      url: `${SITE_URL}/rhymes/${rhyme.slug}/page/1`,
      description: `قصائد على قافية ${rhyme.name} - ${toArabicDigits(rhyme.poemsCount)} قصيدة و ${toArabicDigits(rhyme.poetsCount)} شاعر`,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'القوافي الشعرية',
    url: `${SITE_URL}/rhymes`,
    description: `قائمة بجميع القوافي الشعرية في موقع قافية - ${toArabicDigits(rhymes.length)} قافية`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'قافية',
      url: SITE_URL,
    },
    numberOfItems: rhymes.length,
    itemListElement: itemListElements,
  };

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <SectionList
        title="القوافي"
        dynamicTitle={`جميع القوافي (${toArabicDigits(rhymes.length)} حرف)`}
      >
        {rhymes.length > 0 ? (
          rhymes.map(({ id, name, poemsCount, poetsCount, slug }) => (
            <ListCard
              key={id}
              name={name}
              href={`/rhymes/${slug}/page/1/`}
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
