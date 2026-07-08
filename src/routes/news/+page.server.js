import { resolveAbsoluteUrl } from '$lib/site-meta.js';
import { getNewsPosts, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
  const site = getSiteConfig();

  return {
    site,
    posts: getNewsPosts(),
    feedUrl: resolveAbsoluteUrl('/news/rss.xml', url.origin, site.url)
  };
}
