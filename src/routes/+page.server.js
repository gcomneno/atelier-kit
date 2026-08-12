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
import {
  resolveDemoPublicConfig
} from '$lib/server/demo-public-config.js';
import {
  getStudioRuntimeMode
} from '$lib/server/studio-guard.js';

export function load() {
  const layout = getLayoutConfig();
  const homeLayout = getHomeLayoutPageData(layout);
  const site = getSiteConfig();
  const collectionsEditorial =
    getCollectionsEditorialConfig();

  let demoAvailable = false;

  try {
    demoAvailable =
      resolveDemoPublicConfig(
        getStudioRuntimeMode(),
        process.env
      ) !== null;
  } catch {
    /*
     * Invalid Demo authoring configuration must never make the public Visitor
     * unavailable. The CTA simply disappears and Visitor remains read-only.
     */
    demoAvailable = false;
  }

  return {
    site,
    demoAvailable,
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
