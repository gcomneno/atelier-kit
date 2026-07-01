import {
  getCatalogConfig,
  getItemById,
  getSignalClouds,
  getSiteConfig
} from '$lib/server/showcase.js';

export function load({ params }) {
  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    item: getItemById(params.id),
    signalClouds: getSignalClouds()
  };
}
