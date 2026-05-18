#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: build supervisor logs progress to the developer.

/**
 * Validates SEO invariants on the built static HTML in dist/.
 * Run after `astro build`. Exits non-zero if any page is missing critical
 * <head> metadata, has the wrong heading hierarchy, or ships invalid JSON-LD.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TITLE_MAX = 80;
const DESC_MIN = 60;
const DESC_MAX = 320;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.name.endsWith('.html')) {
      yield full;
    }
  }
}

const RX = {
  title: /<title[^>]*>([\s\S]*?)<\/title>/i,
  desc: /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
  canonical: /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  ogImage: /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  ogType: /<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i,
  twitterCard: /<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i,
  h1: /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
  ld: /<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
};

const problems: string[] = [];

for await (const file of walk(DIST)) {
  const rel = file.replace(DIST, '/');
  const html = await readFile(file, 'utf8');
  const is404 = rel.endsWith('/404.html');

  const titleMatch = RX.title.exec(html);
  const title = titleMatch?.[1]?.trim();
  if (!title) {
    problems.push(`${rel}: missing <title>`);
  } else if (title.length > TITLE_MAX) {
    problems.push(`${rel}: <title> > ${TITLE_MAX} chars (${title.length})`);
  }

  if (!is404) {
    const desc = RX.desc.exec(html)?.[1]?.trim();
    if (!desc) {
      problems.push(`${rel}: missing <meta description>`);
    } else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      problems.push(`${rel}: description length ${desc.length} not in [${DESC_MIN},${DESC_MAX}]`);
    }
    if (!RX.canonical.test(html)) problems.push(`${rel}: missing canonical`);
    if (!RX.ogImage.test(html)) problems.push(`${rel}: missing og:image`);
    if (!RX.ogType.test(html)) problems.push(`${rel}: missing og:type`);
    const twCard = RX.twitterCard.exec(html)?.[1]?.trim();
    if (twCard !== 'summary_large_image') {
      problems.push(
        `${rel}: twitter:card must be summary_large_image (got "${twCard ?? 'missing'}")`
      );
    }
    const h1s = [...html.matchAll(RX.h1)];
    if (h1s.length !== 1) {
      problems.push(`${rel}: expected 1 <h1>, got ${h1s.length}`);
    }
  }

  for (const ldMatch of html.matchAll(RX.ld)) {
    try {
      JSON.parse(ldMatch[1] ?? '');
    } catch (e) {
      problems.push(`${rel}: invalid JSON-LD (${(e as Error).message})`);
    }
  }
}

if (problems.length > 0) {
  console.error(`SEO regressions (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('SEO: all pages pass');
