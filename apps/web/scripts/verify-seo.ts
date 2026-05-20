#!/usr/bin/env bun

// biome-ignore-all lint/suspicious/noConsole: verifier logs progress to the developer.

/**
 * Validates SEO invariants by fetching a representative URL per route template
 * from a running server (one URL per template proves the template). Set BASE_URL
 * and the sample slugs via env. Exits non-zero on any missing/invalid metadata.
 */

import { Result } from 'neverthrow';

const safeParseJson = Result.fromThrowable(
  (raw: string): unknown => JSON.parse(raw),
  (cause): { message: string } => ({
    message: cause instanceof Error ? cause.message : String(cause),
  })
);

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:4321';
const POEM_SLUG = process.env['SEO_POEM_SLUG'];
const ERA_SLUG = process.env['SEO_ERA_SLUG'];
const POET_SLUG = process.env['SEO_POET_SLUG'];
const TITLE_MAX = 80;
const DESC_MIN = 60;
const DESC_MAX = 320;

const paths = ['/', '/eras', '/meters', '/rhymes', '/themes', '/poets/page/1', '/404'];
if (ERA_SLUG) paths.push(`/eras/${ERA_SLUG}/page/1`);
if (POET_SLUG) paths.push(`/poets/${POET_SLUG}/page/1`);
if (POEM_SLUG) paths.push(`/poems/${POEM_SLUG}`);

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

for (const path of paths) {
  const res = await fetch(`${BASE_URL}${path}`);
  const html = await res.text();
  const is404 = path === '/404';

  const title = RX.title.exec(html)?.[1]?.trim();
  if (!title) {
    problems.push(`${path}: missing <title>`);
  } else if (title.length > TITLE_MAX) {
    problems.push(`${path}: <title> > ${TITLE_MAX} chars (${title.length})`);
  }

  if (!is404) {
    const desc = RX.desc.exec(html)?.[1]?.trim();
    if (!desc) {
      problems.push(`${path}: missing <meta description>`);
    } else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      problems.push(`${path}: description length ${desc.length} not in [${DESC_MIN},${DESC_MAX}]`);
    }
    if (!RX.canonical.test(html)) problems.push(`${path}: missing canonical`);
    if (!RX.ogImage.test(html)) problems.push(`${path}: missing og:image`);
    if (!RX.ogType.test(html)) problems.push(`${path}: missing og:type`);
    const twCard = RX.twitterCard.exec(html)?.[1]?.trim();
    if (twCard !== 'summary_large_image') {
      problems.push(
        `${path}: twitter:card must be summary_large_image (got "${twCard ?? 'missing'}")`
      );
    }
    const h1s = [...html.matchAll(RX.h1)];
    if (h1s.length !== 1) {
      problems.push(`${path}: expected 1 <h1>, got ${h1s.length}`);
    }
  }

  for (const ldMatch of html.matchAll(RX.ld)) {
    const parsed = safeParseJson(ldMatch[1] ?? '');
    if (parsed.isErr()) problems.push(`${path}: invalid JSON-LD (${parsed.error.message})`);
  }
}

if (problems.length > 0) {
  console.error(`SEO regressions (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`SEO: all ${paths.length} sampled routes pass`);
