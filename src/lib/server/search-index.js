import { getItems, getNewsPosts } from '$lib/server/showcase.js';
import { markedTextToPlainText } from '$lib/marked-text.js';

/** @typedef {import('$lib/search-index.js').SearchEntry} SearchEntry */

/** @returns {SearchEntry[]} */
export function buildSearchIndex() {
  /** @type {SearchEntry[]} */
  const entries = [];

  for (const item of getItems()) {
    entries.push({
      type: 'item',
      title: markedTextToPlainText(item.title),
      href: `/items/${item.id}`,
      ...(item.subtitle ? { excerpt: markedTextToPlainText(item.subtitle) } : {})
    });
  }

  for (const post of getNewsPosts()) {
    entries.push({
      type: 'news',
      title: markedTextToPlainText(post.title),
      href: `/news/${post.id}`,
      ...(post.excerpt ? { excerpt: markedTextToPlainText(post.excerpt) } : {})
    });
  }

  return entries;
}
