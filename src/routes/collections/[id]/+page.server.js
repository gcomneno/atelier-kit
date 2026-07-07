import { error } from '@sveltejs/kit';
import {
  getCatalogConfig,
  getCollectionById,
  getHomeLayoutPageData,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
  const collection = getCollectionById(params.id);

  if (!collection) {
    throw error(404, 'Collection not found');
  }

  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);

  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collection,
    ...homeLayout
  };
}
