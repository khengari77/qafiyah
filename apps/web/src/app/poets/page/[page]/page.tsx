import { NOT_FOUND_TITLE, SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import type { Metadata } from 'next';
import { toArabicDigits } from 'to-arabic-digits';
import PoetsClientPage from './client';

export const runtime = 'edge';

type Props = {
  params: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const title = `قافية | تصفح حسب الدواوين | صفحة (${toArabicDigits(page)})`;
  if (page) {
    return {
      title,
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        locale: 'ar_AR',
        url: `${SITE_URL}/poets/page/${page || 1}`,
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
  return {
    title: NOT_FOUND_TITLE,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function Page() {
  return <PoetsClientPage />;
}
