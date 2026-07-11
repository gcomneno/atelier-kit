import {
  getCatalogConfig,
  getHomeLayoutPageData,
  getCollections,
  getLayoutConfig,
  getSiteConfig
} from '$lib/server/showcase.js';
import { getLayoutPageEyebrow } from '$lib/layout-block-labels.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);

  return {
    site: getSiteConfig(),
    catalog: getCatalogConfig(),
    collections: getCollections(),
    pageEyebrow: getLayoutPageEyebrow(homeLayout.blockLabels, 'collections'),
    ...homeLayout
  };
}
