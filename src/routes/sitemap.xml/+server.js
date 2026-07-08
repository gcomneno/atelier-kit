import { buildSitemapUrls, serializeSitemapXml } from '$lib/server/sitemap.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
  const body = serializeSitemapXml(buildSitemapUrls(url.origin));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
