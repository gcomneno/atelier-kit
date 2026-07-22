import { error } from '@sveltejs/kit';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import { resolveItemCoverSrc } from '$lib/item-cover.js';
import { markedTextToPlainText } from '$lib/marked-text.js';
import { getVisitorBriefSocialProfiles } from '$lib/social-networks.js';
import {
  getCatalogConfig,
  getContactConfig,
  getItemById,
  getItemNeighbors,
  getItems,
  getSignalClouds,
  getSocialConfig,
  getSiteConfig
} from '$lib/server/showcase.js';

/** @typedef {ReturnType<typeof getItems>[number]} ShowcaseItem */
/** @typedef {{ type: string, target: string, label?: string }} ItemRelation */

/** @type {import('./$types').PageServerLoad} */
export function load({ params, url }) {
  const item = getItemById(params.id);

  if (!item) {
    throw error(404, 'Item not found');
  }

  const site = getSiteConfig();
  /** @type {Map<string, ShowcaseItem>} */
  const itemsById = new Map(getItems().map((candidate) => [candidate.id, candidate]));
  const relatedItems = item.relations.flatMap((/** @type {ItemRelation} */ relation) => {
    const relatedItem = itemsById.get(relation.target);

    return relatedItem ? [{ relation, item: relatedItem }] : [];
  });

  return {
    item,
    relatedItems,
    catalog: getCatalogConfig(),
    neighbors: getItemNeighbors(params.id),
    signalClouds: getSignalClouds(),
    contact: getContactConfig(),
    socialProfiles: getVisitorBriefSocialProfiles(getSocialConfig().links),
    seo: {
      ogTitle: markedTextToPlainText(item.title),
      ogDescription: markedTextToPlainText(item.description),
      ogImage: resolveAbsoluteImageUrl(resolveItemCoverSrc(item), url.origin, site.url)
    }
  };
}
