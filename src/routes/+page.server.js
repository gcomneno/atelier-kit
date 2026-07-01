import { getCatalogConfig, getItems, getSiteConfig } from '$lib/server/showcase.js';

export function load() {
  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    items: getItems()
  };
}
