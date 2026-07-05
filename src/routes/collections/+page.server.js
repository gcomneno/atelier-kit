import {
  getCatalogConfig,
  getCatalogSidebarPageData,
  getCollections,
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
    ...sidebarPage
  };
}
