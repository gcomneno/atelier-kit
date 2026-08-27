import { getNewsPost } from '$lib/server/showcase.js';

/**
 * Resolve one public News detail record for the managed Visitor route.
 *
 * This default Atelier-Kit adapter preserves canonical News behavior.
 * Client projects may preserve and replace only this adapter while delegating
 * client-specific resolution outside the managed source tree.
 *
 * @param {string} id
 * @returns {ReturnType<typeof getNewsPost>}
 */
export function resolveNewsDetailPost(id) {
  return getNewsPost(id);
}
