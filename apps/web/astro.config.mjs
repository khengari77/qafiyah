import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { PROD_SITE_URL } from '@qafiyah/constants';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const SITEMAP_404_PATTERN = /\/404\/?$/;

export default defineConfig({
  output: 'static',
  site: PROD_SITE_URL,
  integrations: [
    react(),
    sitemap({
      filter: (page) => !SITEMAP_404_PATTERN.test(page),
      serialize(item) {
        return { ...item, lastmod: new Date().toISOString() };
      },
    }),
  ],
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { exclude: ['@qafiyah/api'] },
  },
});
