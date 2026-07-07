import {
  getCatalogConfig,
  getHomeLayoutPageData,
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
    items: getItems(),
    ...homeLayout
  };
}
