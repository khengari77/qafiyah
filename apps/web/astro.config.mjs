import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { PROD_SITE_URL } from '@qafiyah/constants';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: PROD_SITE_URL,
  integrations: [react(), sitemap()],
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { exclude: ['@qafiyah/api'] },
  },
});
