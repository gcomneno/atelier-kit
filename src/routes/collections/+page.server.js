import { getCatalogConfig, getCollections, getSiteConfig } from '$lib/server/showcase.js';

export function load() {
  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collections: getCollections()
  };
}
