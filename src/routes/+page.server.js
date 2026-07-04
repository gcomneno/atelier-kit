import { getCatalogConfig, getCollections, getItems, getSiteConfig } from '$lib/server/showcase.js';

export function load() {
  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collections: getCollections(),
    items: getItems()
  };
}
