import { error } from '@sveltejs/kit';
import { getCatalogConfig, getCollectionById, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
  const collection = getCollectionById(params.id);

  if (!collection) {
    throw error(404, 'Collection not found');
  }

  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collection
  };
}
