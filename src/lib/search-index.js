/**
 * @typedef {{ type: 'item' | 'news', title: string, href: string, excerpt?: string }} SearchEntry
 */

/**
 * @param {SearchEntry[]} entries
 * @param {string} query
 * @param {number} [limit]
 * @returns {SearchEntry[]}
 */
export function filterSearchEntries(entries, query, limit = 8) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return entries
    .filter((entry) => {
      if (entry.title.toLowerCase().includes(normalized)) {
        return true;
      }

      return entry.excerpt?.toLowerCase().includes(normalized) ?? false;
    })
    .slice(0, limit);
}
