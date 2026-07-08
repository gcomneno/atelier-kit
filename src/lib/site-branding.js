/**
 * @param {string | undefined | null} value
 */
function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 */
function hasField(record, field) {
  return Object.prototype.hasOwnProperty.call(record, field);
}

/**
 * Header title for the visitor nav. Falls back to legacy `name` only when
 * `header_title` was never configured in YAML.
 *
 * @param {{ name?: string, header_title?: string }} site
 */
export function resolveHeaderTitle(site) {
  if (hasField(site, 'header_title')) {
    return trimOrEmpty(site.header_title);
  }

  return trimOrEmpty(site.name);
}

/**
 * Intro title for the home hero. Falls back to legacy `name` only when
 * `intro_title` was never configured in YAML. Never inherits header title.
 *
 * @param {{ name?: string, intro_title?: string }} site
 */
export function resolveIntroTitle(site) {
  if (hasField(site, 'intro_title')) {
    return trimOrEmpty(site.intro_title);
  }

  return trimOrEmpty(site.name);
}

/**
 * @param {{ name?: string, intro_title?: string, header_title?: string, tagline?: string }} site
 */
export function resolveDocumentTitle(site) {
  return (
    resolveIntroTitle(site) ||
    resolveHeaderTitle(site) ||
    trimOrEmpty(site.name) ||
    trimOrEmpty(site.tagline)
  );
}
