import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

function buildProfiler() {
  let t0;
  return {
    name: 'build-profiler',
    hooks: {
      'astro:build:start': () => {
        t0 = performance.now();
        console.log('[profiler] ── Build started ──');
      },
      'astro:build:done': ({ pages }) => {
        const totalMs = performance.now() - t0;
        const stats = globalThis._qBuildStats ?? { calls: 0, timings: [] };
        const staticPhaseMs = stats.timings.reduce((s, t) => s + t.ms, 0);
        console.log('\n[profiler] ── Build complete ──');
        console.log(`  pages        ${pages.length}`);
        console.log(`  total        ${(totalMs / 1000).toFixed(1)}s`);
        console.log(`  API calls    ${stats.calls}`);
        console.log(`  getStaticPaths phase  ~${(staticPhaseMs / 1000).toFixed(1)}s`);
        console.log(
          `  render phase          ~${((totalMs - staticPhaseMs) / 1000).toFixed(1)}s (est.)`
        );
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  site: 'https://qafiyah.com',
  integrations: [buildProfiler(), react(), sitemap()],
  trailingSlash: 'ignore',
  vite: {
    optimizeDeps: { include: ['cookie'] },
    ssr: { optimizeDeps: { include: ['cookie'] } },
  },
});
