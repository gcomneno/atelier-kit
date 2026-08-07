import {
  getCatalogConfig,
  getCollectionsEditorialConfig,
  getHomeLayoutPageData,
  getCollections,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';
import {
  getLayoutPageEyebrow
} from '$lib/layout-block-labels.js';
import {
  resolveCollectionsPageEyebrow
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
    pageEyebrow:
      resolveCollectionsPageEyebrow(
        collectionsEditorial,
        getLayoutPageEyebrow(
          homeLayout.blockLabels,
          'collections'
        ),
        site.language
      ),
    ...homeLayout
  };
}
