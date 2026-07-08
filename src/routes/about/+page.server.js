import { error } from '@sveltejs/kit';
import { buildAboutPageJsonLd } from '$lib/server/json-ld.js';
import { getAboutConfig, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
  const about = getAboutConfig();

  if (!about) {
    error(404, 'About page not available');
  }

  const site = getSiteConfig();

  return {
    site,
    about,
    jsonLd: buildAboutPageJsonLd(about, site, url.origin)
  };
}
