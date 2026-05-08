import { SITE_NAME, SITE_URL } from '@/constants/globals';
import { htmlHeadMetadata } from '@/constants/site-metadata';

export function buildOpenGraphMetadata(params: {
  title: string;
  url: string;
  description?: string;
}) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    locale: 'ar_AR',
    url: params.url,
    title: params.title,
    ...(params.description && { description: params.description }),
    images: [
      {
        url: `${SITE_URL}${htmlHeadMetadata.openGraphUrl}`,
        width: 1200,
        height: 630,
        type: 'image/png',
      },
    ],
  };
}

export function buildTwitterMetadata(params: { title: string; description?: string }) {
  return {
    title: params.title,
    ...(params.description && { description: params.description }),
    images: [`${SITE_URL}${htmlHeadMetadata.openGraphUrl}`],
  };
}
