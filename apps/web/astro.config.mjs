import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://qafiyah.com',
  integrations: [react(), sitemap()],
  trailingSlash: 'ignore',
  vite: {
    optimizeDeps: { include: ['cookie'] },
    ssr: { optimizeDeps: { include: ['cookie'] } },
  },
});
