import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Key } from 'react';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { PageNavigationButtons, PageSectionWithHeader } from '@/components/ui/section-wrapper';
import { NOT_FOUND_TITLE, SITE_URL } from '@/constants/globals';
import { POEMS_PER_PAGE } from '@/constants/pagination';
import {
  fetchMeterPoemPage,
  fetchMetersWithPoemCount,
  generatePageNumbers,
} from '@/lib/api/static';
import { buildOpenGraphMetadata, buildTwitterMetadata } from '@/lib/metadata-helpers';

const METERS = new Map([
  ['ahd-alkamil', 'أحذ الكامل'],
  ['mashtur-alrajz', 'مشطور الرجز'],
  ['mukhalla-albasit', 'مخلع البسيط'],
  ['muwashah', 'الموشح'],
  ['alqawma', 'القوما'],
  ['alhazaj', 'الهزج'],
  ['majzu-alramal', 'مجزوء الرمل'],
  ['majzu-muwashah', 'مجزوء موشح'],
  ['manhuk', 'المنهوك'],
  ['alkamil', 'الكامل'],
  ['almujtath', 'المجتث'],
  ['majzu-altawil', 'مجزوء الطويل'],
  ['mukhalla', 'المخلع'],
  ['aldubayt', 'الدوبيت'],
  ['alwafir', 'الوافر'],
  ['almawaliya', 'المواليا'],
  ['ghayr-musanaf', 'الغير مصنف'],
  ['al-madid', 'المديد'],
  ['altawil', 'الطويل'],
  ['alsilsila', 'السلسلة'],
  ['mashtur', 'المشطور'],
  ['almuqtadab', 'المقتضب'],
  ['majzu-alwafir', 'مجزوء الوافر'],
  ['ahd', 'الأحذ'],
  ['altafila', 'التفعيلة'],
  ['almudari', 'المضارع'],
  ['majzu-alkhafif', 'مجزوء الخفيف'],
  ['tafila', 'التفعيلة'],
  ['alsarie', 'السريع'],
  ['manhuk-almunsarih', 'منهوك المنسرح'],
  ['almunsarih', 'المنسرح'],
  ['murabba', 'المربع'],
  ['majzu-alrajz', 'مجزوء الرجز'],
  ['almutadarak', 'المتدارك'],
  ['adad', 'العدد'],
  ['almutakarib', 'المتقارب'],
  ['alrajz', 'الرجز'],
  ['majzu-almutakarib', 'مجزوء المتقارب'],
  ['alkhafif', 'الخفيف'],
  ['majzu-alhazaj', 'مجزوء الهزج'],
  ['alramal', 'الرمل'],
  ['majzu', 'المجزوء'],
  ['albasit', 'البسيط'],
  ['majzu-alkamil', 'مجزوء الكامل'],
]);

type Props = {
  params: Promise<{ slug: string; page: string }>;
};

export async function generateStaticParams() {
  const meters = await fetchMetersWithPoemCount();
  const params: Array<{ slug: string; page: string }> = [];

  for (const meter of meters) {
    const pages = generatePageNumbers(meter.poemsCount);
    for (const page of pages) {
      params.push({ slug: meter.slug, page: page.toString() });
    }
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;

  if (!METERS.has(slug)) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  const meterName = METERS.get(slug);
  const title = `قافية | قصائد بحر ${meterName} | صفحة (${toArabicDigits(page)})`;

  return {
    title,
    openGraph: buildOpenGraphMetadata({
      title,
      url: `${SITE_URL}/meters/${slug}/page/${page}`,
    }),
    twitter: buildTwitterMetadata({ title }),
  };
}

export default async function MeterPage({ params }: Props) {
  const { slug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!slug || !Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  const result = await fetchMeterPoemPage(slug, page);
  if (!result?.data) {
    notFound();
  }
  const { data, pagination } = result;
  const { meterDetails: meter, poems } = data;

  const totalPages = pagination?.totalPages || Math.ceil(meter.poemsCount / POEMS_PER_PAGE);
  const hasNextPage = pagination?.hasNextPage || pageNumber < totalPages;
  const hasPrevPage = pagination?.hasPrevPage || pageNumber > 1;

  const nextPageUrl = `/meters/${slug}/page/${pageNumber + 1}`;
  const prevPageUrl = `/meters/${slug}/page/${pageNumber - 1}`;

  const content = {
    header: `قصائد من بحر ${meter.name} (${toArabicDigits(meter.poemsCount)} قصيدة)`,
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };

  const itemListElements = poems.map((poem, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'CreativeWork',
      name: poem.title,
      url: `${SITE_URL}/poems/${poem.slug}`,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Collection',
    name: `قصائد من بحر ${meter.name}`,
    url: `${SITE_URL}/meters/${slug}/page/${pageNumber}`,
    description: `مجموعة قصائد من بحر ${meter.name} - الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
    mainEntityOfPage: {
      '@type': 'CollectionPage',
      name: `قصائد من بحر ${meter.name}`,
      url: `${SITE_URL}/meters/${slug}/page/1`,
    },
    numberOfItems: meter.poemsCount,
    itemListElement: itemListElements,
  };

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <PageSectionWithHeader
        dynamicTitle={content.header}
        pagination={{
          totalPages,
          component: (
            <PageNavigationButtons
              headerTip={content.headerTip}
              nextPageUrl={nextPageUrl}
              prevPageUrl={prevPageUrl}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
            />
          ),
        }}
      >
        {poems.length > 0 ? (
          poems.map((poem: { slug: Key | null | undefined; title: string; poetName: string }) => (
            <ListCard
              key={poem.slug}
              href={`/poems/${poem.slug}`}
              name={poem.title}
              title={poem.poetName}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500">لا توجد قصائد لهذا البحر.</p>
        )}
      </PageSectionWithHeader>
    </>
  );
}
