/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * External item calls-to-action deliberately support only absolute HTTP(S)
 * destinations. Internal navigation belongs to item.preview or normal site
 * navigation.
 *
 * @param {unknown} href
 * @returns {boolean}
 */
export function isValidItemExternalCtaHref(href) {
  if (typeof href !== 'string' || href.trim() === '') {
    return false;
  }

  try {
    const url = new URL(href.trim());

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Defensive public-runtime normalization.
 *
 * Authoring validation is stricter and should reject malformed records before
 * publication; runtime normalization still fails closed so a bad CTA never
 * becomes a broken or unsafe public link.
 *
 * @param {unknown} value
 * @returns {{ href: string, label: string } | null}
 */
export function normalizeItemExternalCta(value) {
  if (!isRecord(value)) {
    return null;
  }

  const href = typeof value.href === 'string' ? value.href.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';

  if (!label || !isValidItemExternalCtaHref(href)) {
    return null;
  }

  return { href, label };
}

/**
 * Structural validation for authoring and publication checks.
 *
 * @param {unknown} value
 * @returns {Array<'object' | 'href' | 'label'>}
 */
export function getItemExternalCtaIssues(value) {
  if (value === undefined) {
    return [];
  }

  if (!isRecord(value)) {
    return ['object'];
  }

  /** @type {Array<'object' | 'href' | 'label'>} */
  const issues = [];

  if (!isValidItemExternalCtaHref(value.href)) {
    issues.push('href');
  }

  if (typeof value.label !== 'string' || value.label.trim() === '') {
    issues.push('label');
  }

  return issues;
}
