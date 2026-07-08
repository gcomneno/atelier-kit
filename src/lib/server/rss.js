import { resolveAbsoluteImageUrl, resolveAbsoluteUrl } from '$lib/site-meta.js';
import { getNewsPosts, getSiteConfig } from '$lib/server/showcase.js';

/**
 * @typedef {{
 *   title: string,
 *   link: string,
 *   guid: string,
 *   pubDate: string,
 *   description: string,
 *   enclosure?: { url: string, type: string }
 * }} RssItem
 */

/**
 * @typedef {{
 *   title: string,
 *   link: string,
 *   description: string,
 *   language: string,
 *   feedUrl: string,
 *   items: RssItem[]
 * }} RssChannel
 */

/**
 * @param {string} value
 */
function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * @param {string} date
 */
function formatRssPubDate(date) {
  const parsed = new Date(`${date}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toUTCString();
}

/**
 * @param {{ excerpt?: string, body: string }} post
 */
function postDescription(post) {
  if (post.excerpt) {
    return post.excerpt;
  }

  const firstLine = post.body.split('\n').find((line) => line.trim() !== '');

  return firstLine?.trim() ?? '';
}

/**
 * @param {string} path
 */
function enclosureMimeType(path) {
  const extension = path.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'gif') {
    return 'image/gif';
  }

  return 'image/jpeg';
}

/**
 * @param {string} origin
 * @returns {RssChannel}
 */
export function buildNewsFeed(origin) {
  const site = getSiteConfig();

  /** @param {string} path */
  const absolute = (path) => resolveAbsoluteUrl(path, origin, site.url);

  const items = getNewsPosts().map((post) => {
    const link = absolute(`/news/${post.id}`);
    const description = postDescription(post);
    const imageFile = post.image_file;

    return {
      title: post.title,
      link,
      guid: link,
      pubDate: formatRssPubDate(post.date),
      description,
      ...(imageFile
        ? {
            enclosure: {
              url: resolveAbsoluteImageUrl(imageFile, origin, site.url),
              type: enclosureMimeType(imageFile)
            }
          }
        : {})
    };
  });

  return {
    title: `${site.name} — News`,
    link: absolute('/news'),
    description: site.tagline || site.name,
    language: site.language || 'en',
    feedUrl: absolute('/news/rss.xml'),
    items
  };
}

/**
 * @param {RssChannel} channel
 * @returns {string}
 */
export function serializeNewsRss(channel) {
  const itemEntries = channel.items
    .map((item) => {
      const enclosureTag = item.enclosure
        ? `\n      <enclosure url="${escapeXml(item.enclosure.url)}" type="${escapeXml(item.enclosure.type)}" length="0" />`
        : '';

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <description>${escapeXml(item.description)}</description>${enclosureTag}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
${itemEntries}
  </channel>
</rss>
`;
}
