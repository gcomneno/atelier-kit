import {
  getAboutConfig,
  getCatalogConfig,
  getHomeLayoutPageData,
  getCollections,
  getItems,
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
    items: getItems(),
    aboutAvailable: getAboutConfig() !== null,
    ...homeLayout
  };
}
