import { type ArabicNounForms, formatArabicCount } from 'arabic-count-format';
import type { Metadata } from 'next';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { SectionList } from '@/components/ui/section-list';
import { SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import { fetchEras } from '@/lib/api/static';

export const metadata: Metadata = {
  title: 'قافية | تصفح حسب العصور',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ar_AR',
    url: `${SITE_URL}/eras`,
    title: 'قافية | تصفح حسب العصور',
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
    title: 'قافية | تصفح حسب العصور',
    images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
  },
};

export default async function ErasPage() {
  const eras = await fetchEras();

  const itemListElements = eras.map((era, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Collection',
      name: era.name,
      url: `${SITE_URL}/eras/${era.slug}/page/1`,
      description: `قصائد العصر ال${era.name} - ${toArabicDigits(era.poemsCount)} قصيدة و ${toArabicDigits(era.poetsCount)} شاعر`,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'العصور الشعرية',
    url: `${SITE_URL}/eras`,
    description: `قائمة بجميع العصور الشعرية في موقع قافية - ${toArabicDigits(eras.length)} عصر`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'قافية',
      url: SITE_URL,
    },
    numberOfItems: eras.length,
    itemListElement: itemListElements,
  };

  const eraForms: ArabicNounForms = {
    singular: 'عصر',
    dual: 'عصران',
    plural: 'عصور',
  };

  const eraLabel = formatArabicCount({
    count: eras.length,
    nounForms: eraForms,
  });

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <SectionList title="العصور" dynamicTitle={`جميع العصور (${eraLabel})`}>
        {eras.length > 0 ? (
          eras.map(({ id, name, poemsCount, poetsCount, slug }) => (
            <ListCard
              key={id}
              name={name}
              href={`/eras/${slug}/page/1/`}
              title={`${toArabicDigits(poetsCount)} شاعر و ${toArabicDigits(poemsCount)} قصيدة`}
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
