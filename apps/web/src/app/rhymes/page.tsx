import { SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import type { Metadata } from 'next';
import RhymesClientPage from './client';

export const runtime = 'edge';

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

export default function Page() {
  return <RhymesClientPage />;
}
