import { error } from '@sveltejs/kit';
import { resolveAbsoluteImageUrl } from '$lib/site-meta.js';
import {
  getCatalogConfig,
  getContactConfig,
  getItemById,
  getItemNeighbors,
  getSignalClouds,
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
    seo: {
      ogTitle: item.title,
      ogDescription: item.description,
      ogImage: resolveAbsoluteImageUrl(item.image_file, url.origin, site.url)
    }
  };
}
