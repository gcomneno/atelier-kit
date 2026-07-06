import {
  getCatalogConfig,
  getHomeLayoutPageData,
  getCollections,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);

  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collections: getCollections(),
    ...homeLayout
  };
}
