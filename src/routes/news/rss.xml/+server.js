import { buildNewsFeed, serializeNewsRss } from '$lib/server/rss.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
  const body = serializeNewsRss(buildNewsFeed(url.origin));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
