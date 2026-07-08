import { getSiteConfig } from '$lib/server/showcase.js';
import { resolveAbsoluteUrl } from '$lib/site-meta.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
  const site = getSiteConfig();
  const sitemapUrl = resolveAbsoluteUrl('/sitemap.xml', url.origin, site.url);

  const body = `# allow crawling everything by default
User-agent: *
Disallow:

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
