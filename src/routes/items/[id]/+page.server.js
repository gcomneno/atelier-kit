import { error } from '@sveltejs/kit';
import {
  getCatalogConfig,
  getContactConfig,
  getItemById,
  getItemNeighbors,
  getSignalClouds
} from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
  const item = getItemById(params.id);

  if (!item) {
    throw error(404, 'Item not found');
  }

  return {
    item,
    catalog: getCatalogConfig(),
    neighbors: getItemNeighbors(params.id),
    signalClouds: getSignalClouds(),
    contact: getContactConfig()
  };
}
