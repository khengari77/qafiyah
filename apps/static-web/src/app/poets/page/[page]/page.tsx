import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { SectionPaginationControllers, SectionWrapper } from '@/components/ui/section-wrapper';
import { NOT_FOUND_TITLE, SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import { fetchPoets, fetchPoetsTotalPages } from '@/lib/api/static';

type Props = {
  params: Promise<{ page: string }>;
};

export async function generateStaticParams() {
  const totalPages = await fetchPoetsTotalPages();
  return Array.from({ length: totalPages }, (_, i) => ({
    page: (i + 1).toString(),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;

  if (!page) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  const title = `قافية | تصفح حسب الدواوين | صفحة (${toArabicDigits(page)})`;

  return {
    title,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ar_AR',
      url: `${SITE_URL}/poets/page/${page}`,
      title,
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
      title,
      images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
    },
  };
}

export default async function PoetsPage({ params }: Props) {
  const { page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  const { data: poetsData, pagination } = await fetchPoets(page);

  if (!poetsData?.poets) {
    notFound();
  }

  const { poets } = poetsData;
  const totalPoets = pagination?.totalItems || 0;
  const totalPages = pagination?.totalPages || Math.ceil(totalPoets / 30);
  const hasNextPage = pagination?.hasNextPage || pageNumber < totalPages;
  const hasPrevPage = pagination?.hasPrevPage || pageNumber > 1;

  const nextPageUrl = `/poets/page/${pageNumber + 1}`;
  const prevPageUrl = `/poets/page/${pageNumber - 1}`;

  const content = {
    header: `جميع الشعراء (${toArabicDigits(totalPoets)} شاعر)`,
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };

  const itemListElements = poets.map((poet, index) => {
    const poetSlug = String(poet.slug ?? '')
      .toLowerCase()
      .replace(/^cat-poet-/, '');
    return {
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: poet.name,
        url: `${SITE_URL}/poets/${poetSlug}/page/1`,
      },
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'قائمة الشعراء',
    url: `${SITE_URL}/poets/page/${pageNumber}`,
    description: `قائمة بجميع الشعراء في موقع قافية - الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'قافية',
      url: SITE_URL,
    },
    numberOfItems: totalPoets,
    itemListElement: itemListElements,
  };

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <SectionWrapper
        dynamicTitle={content.header}
        pagination={{
          totalPages,
          component: (
            <SectionPaginationControllers
              headerTip={content.headerTip}
              nextPageUrl={nextPageUrl}
              prevPageUrl={prevPageUrl}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
            />
          ),
        }}
      >
        {poets.length > 0 ? (
          poets.map((poet) => (
            <ListCard
              key={poet.slug}
              href={`/poets/${String(poet.slug ?? '')
                .toLowerCase()
                .replace(/^cat-poet-/, '')}/page/1`}
              name={poet.name}
              title={`${toArabicDigits(poet.poemsCount)} قصيدة`}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500">لا يوجد المزيد من الشعراء</p>
        )}
      </SectionWrapper>
    </>
  );
}
