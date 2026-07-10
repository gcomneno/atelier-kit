import { buildFaqPageJsonLd } from '$lib/server/json-ld.js';
import { getFaqEntries, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
  const site = getSiteConfig();
  const entries = getFaqEntries();

  return {
    site,
    entries,
    jsonLd:
      entries.length > 0
        ? buildFaqPageJsonLd(entries, site, url.origin)
        : null
  };
}
