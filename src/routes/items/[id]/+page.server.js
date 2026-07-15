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
  getSignalClouds,
  getSocialConfig,
  getSiteConfig
} from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params, url }) {
  const item = getItemById(params.id);

  if (!item) {
    throw error(404, 'Item not found');
  }

  const site = getSiteConfig();

  return {
    item,
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
