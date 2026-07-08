/**
 * @param {string | undefined | null} value
 */
function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {{ name?: string, header_title?: string }} site
 */
export function resolveHeaderTitle(site) {
  return trimOrEmpty(site.header_title) || trimOrEmpty(site.name);
}

/**
 * @param {{ name?: string, intro_title?: string }} site
 */
export function resolveIntroTitle(site) {
  return trimOrEmpty(site.intro_title) || trimOrEmpty(site.name);
}

/**
 * @param {{ name?: string, intro_title?: string, header_title?: string }} site
 */
export function resolveDocumentTitle(site) {
  return resolveIntroTitle(site) || resolveHeaderTitle(site);
}
