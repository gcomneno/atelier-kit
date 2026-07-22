import { resolveAbsoluteUrl } from '$lib/site-meta.js';
import {
  getAboutConfig,
  getCollections,
  getItems,
  getLegalPages,
  getNewsPosts,
  getSiteConfig
} from '$lib/server/showcase.js';

/**
 * @typedef {{ loc: string, lastmod?: string }} SitemapUrl
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
 * @param {string} origin
 * @returns {SitemapUrl[]}
 */
export function buildSitemapUrls(origin) {
  const site = getSiteConfig();

  /** @param {string} path */
  const absolute = (path) => resolveAbsoluteUrl(path, origin, site.url);

  /** @type {SitemapUrl[]} */
  const urls = [{ loc: absolute('/') }];
  const items = getItems();

  for (const item of items) {
    urls.push({ loc: absolute(`/items/${item.id}`) });
  }

  if (items.some((item) => item.relations.length > 0)) {
    urls.push({ loc: absolute('/relationships') });
  }

  const collections = getCollections();

  if (collections.length > 0) {
    urls.push({ loc: absolute('/collections') });

    for (const collection of collections) {
      urls.push({ loc: absolute(`/collections/${collection.id}`) });
    }
  }

  const posts = getNewsPosts();

  if (posts.length > 0) {
    urls.push({ loc: absolute('/news') });

    for (const post of posts) {
      urls.push({
        loc: absolute(`/news/${post.id}`),
        ...(post.date ? { lastmod: post.date.slice(0, 10) } : {})
      });
    }
  }

  if (getAboutConfig()) {
    urls.push({ loc: absolute('/about') });
  }

  for (const page of getLegalPages()) {
    urls.push({ loc: absolute(`/legal/${page.slug}`) });
  }

  return urls;
}

/**
 * @param {SitemapUrl[]} urls
 * @returns {string}
 */
export function serializeSitemapXml(urls) {
  const entries = urls
    .map(({ loc, lastmod }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
