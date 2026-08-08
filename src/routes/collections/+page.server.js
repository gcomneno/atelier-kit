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
  resolveCollectionsPageEyebrow,
  resolveCollectionsPageIntro,
  resolveCollectionsPageTitle
} from '$lib/collections-editorial.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);
  const site = getSiteConfig();
  const catalog = getCatalogConfig();
  const collectionsEditorial =
    getCollectionsEditorialConfig();

  return {
    site,
    catalog,
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
    pageTitle: resolveCollectionsPageTitle(
      collectionsEditorial,
      site.language
    ),
    pageIntro: resolveCollectionsPageIntro(
      collectionsEditorial,
      catalog.item_name_plural,
      site.language
    ),
    ...homeLayout
  };
}
