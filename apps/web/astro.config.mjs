import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { PROD_SITE_URL } from '@qafiyah/constants';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: PROD_SITE_URL,
  integrations: [react(), sitemap()],
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: {
    // AppRouter is type-only; keep Vite from trying to pre-bundle the API package.
    optimizeDeps: { exclude: ['@qafiyah/api'] },
  },
});
