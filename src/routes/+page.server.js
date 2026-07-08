import {
  getCatalogConfig,
  getHomeLayoutPageData,
  getCollections,
  getItems,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';
import { resolveIntroTitle } from '$lib/site-branding.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);
  const site = getSiteConfig();

  return {
    site: {
      ...site,
      intro_title: resolveIntroTitle(site)
    },
    catalog: getCatalogConfig(),
    collections: getCollections(),
    items: getItems(),
    ...homeLayout
  };
}
