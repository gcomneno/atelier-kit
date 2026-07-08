import { getItems, getNewsPosts } from '$lib/server/showcase.js';

/** @typedef {import('$lib/search-index.js').SearchEntry} SearchEntry */

/** @returns {SearchEntry[]} */
export function buildSearchIndex() {
  /** @type {SearchEntry[]} */
  const entries = [];

  for (const item of getItems()) {
    entries.push({
      type: 'item',
      title: item.title,
      href: `/items/${item.id}`,
      ...(item.subtitle ? { excerpt: item.subtitle } : {})
    });
  }

  for (const post of getNewsPosts()) {
    entries.push({
      type: 'news',
      title: post.title,
      href: `/news/${post.id}`,
      ...(post.excerpt ? { excerpt: post.excerpt } : {})
    });
  }

  return entries;
}
