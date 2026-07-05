import {
  getAboutConfig,
  getCatalogConfig,
  getCatalogSidebarPageData,
  getCollections,
  getItems,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';

export function load() {
  const layout = getLayoutConfig();
  const sidebarPage = getCatalogSidebarPageData(layout);

  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collections: getCollections(),
    items: getItems(),
    aboutAvailable: getAboutConfig() !== null,
    ...sidebarPage
  };
}
