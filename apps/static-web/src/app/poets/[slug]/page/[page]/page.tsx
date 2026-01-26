import { formatArabicCount } from 'arabic-count-format';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Key } from 'react';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { SectionPaginationControllers, SectionWrapper } from '@/components/ui/section-wrapper';
import { NOT_FOUND_TITLE, SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import {
  fetchAllPoetsWithStats,
  fetchPoetInfo,
  fetchPoetPoems,
  generatePageNumbers,
} from '@/lib/api/static';

type Props = {
  params: Promise<{ slug: string; page: string }>;
};

export async function generateStaticParams() {
  const poets = await fetchAllPoetsWithStats();
  const params: Array<{ slug: string; page: string }> = [];

  for (const poet of poets) {
    const pages = generatePageNumbers(poet.poemsCount);
    for (const page of pages) {
      params.push({ slug: poet.slug, page: page.toString() });
    }
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;

  const poetInfo = await fetchPoetInfo(slug);

  if (!poetInfo) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  const poetData = poetInfo.poet;
  const poetName = poetData?.name || 'شاعر غير معروف';
  const poemsCount = poetData?.poemsCount || 0;
  const eraName = poetData?.era?.name || 'غير محدد';

  const title = `قافية: ديوان «${poetName}» - صفحة (${toArabicDigits(page)})`;

  return {
    title,
    description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
    keywords: `${poetName}, شعر, قصائد, العصر ال${eraName}, شاعر`,
    authors: [{ name: poetName }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        notranslate: false,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ar_AR',
      url: `${SITE_URL}/poets/${slug}/page/${page}`,
      title: `قافية | ديوان ${poetName}`,
      description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
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
      title: `قافية | ديوان ${poetName}`,
      description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
      images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
    },
  };
}

export default async function PoetPoemsPage({ params }: Props) {
  const { slug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!slug || !Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  const { data: poetData, pagination } = await fetchPoetPoems(slug, page);

  if (!poetData) {
    notFound();
  }

  const { poetDetails, poems } = poetData;
  const totalPages = pagination?.totalPages || Math.ceil(poetDetails.poemsCount / 30);
  const hasNextPage = pagination?.hasNextPage || pageNumber < totalPages;
  const hasPrevPage = pagination?.hasPrevPage || pageNumber > 1;

  const nextPageUrl = `/poets/${slug}/page/${pageNumber + 1}`;
  const prevPageUrl = `/poets/${slug}/page/${pageNumber - 1}`;

  const content = {
    header: `${poetDetails.name} (${toArabicDigits(poetDetails.poemsCount)} قصيدة)`,
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: poetDetails.name,
    url: `${SITE_URL}/poets/${slug}/page/${pageNumber}`,
    description: `ديوان ${poetDetails.name} (${formatArabicCount({
      count: poetDetails.poemsCount,
      nounForms: {
        singular: 'قصيدة',
        dual: 'قصيدتان',
        plural: 'قصائد',
      },
    })})`,
    mainEntityOfPage: {
      '@type': 'CollectionPage',
      name: `ديوان ${poetDetails.name}`,
      url: `${SITE_URL}/poets/${slug}/page/1`,
    },
    workExample: poems.slice(0, 10).map((poem) => ({
      '@type': 'CreativeWork',
      name: poem.title,
      description: `قصيدة (${poem.title}) على ${poem.meter}`,
      url: `${SITE_URL}/poems/${poem.slug}`,
    })),
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
        {poems.length > 0 ? (
          poems.map((poem: { slug: Key | null | undefined; title: string; meter: string }) => (
            <ListCard
              key={poem.slug}
              href={`/poems/${poem.slug}`}
              name={poem.title}
              title={`${poem.meter}`}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500">لا توجد قصائد لهذا الشاعر.</p>
        )}
      </SectionWrapper>
    </>
  );
}
