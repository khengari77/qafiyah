import { resolve } from 'node:path';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://qafiyah.com',
  integrations: [react(), sitemap()],
  trailingSlash: 'ignore',
  vite: {
    resolve: {
      alias: {
        'to-arabic-digits': resolve('./src/utils/texts/arabic-digits.ts'),
      },
    },
  },
});
