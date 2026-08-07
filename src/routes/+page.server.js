import {
  getCatalogConfig,
  getCollectionsEditorialConfig,
  getHomeLayoutPageData,
  getCollections,
  getItems,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';
import {
  resolveHomeCollectionsEyebrow
} from '$lib/collections-editorial.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);
  const site = getSiteConfig();
  const collectionsEditorial =
    getCollectionsEditorialConfig();

  return {
    site,
    catalog: getCatalogConfig(),
    collections: getCollections(),
    items: getItems(),
    homeCollectionsEyebrow:
      resolveHomeCollectionsEyebrow(
        collectionsEditorial,
        site.language
      ),
    ...homeLayout
  };
}
