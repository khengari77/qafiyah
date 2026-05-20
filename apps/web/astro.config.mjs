import node from '@astrojs/node';
import react from '@astrojs/react';
import { PROD_SITE_URL } from '@qafiyah/constants';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: PROD_SITE_URL,
  integrations: [react()],
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
  },
});
