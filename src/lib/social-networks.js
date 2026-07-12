/** @typedef {'instagram' | 'facebook' | 'x' | 'github'} SocialNetworkId */

/** @type {SocialNetworkId[]} */
export const SOCIAL_NETWORK_IDS = ['instagram', 'facebook', 'x', 'github'];

/** @type {Record<string, SocialNetworkId>} */
export const SOCIAL_NETWORK_ALIASES = {
  twitter: 'x'
};

/**
 * @param {string} id
 * @returns {SocialNetworkId | ''}
 */
export function normalizeSocialId(id) {
  const lower = id.trim().toLowerCase();
  const normalized = SOCIAL_NETWORK_ALIASES[lower] ?? lower;

  if (SOCIAL_NETWORK_IDS.includes(/** @type {SocialNetworkId} */ (normalized))) {
    return /** @type {SocialNetworkId} */ (normalized);
  }

  return '';
}

/**
 * @param {string} url
 */
export function isValidSocialUrl(url) {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validate a social URL according to the selected network.
 * Legacy networks retain the existing generic HTTP(S) validation.
 *
 * @param {SocialNetworkId} id
 * @param {string} url
 */
export function isValidSocialUrlForNetwork(id, url) {
  if (!isValidSocialUrl(url)) {
    return false;
  }

  if (id !== 'github') {
    return true;
  }

  const hostname = new URL(url.trim()).hostname.toLowerCase();
  return hostname === 'github.com' || hostname === 'www.github.com';
}

/** @param {unknown[]} links */
export function socialLinksToForm(links) {
  const form = Object.fromEntries(SOCIAL_NETWORK_IDS.map((id) => [id, '']));

  for (const entry of links) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = /** @type {Record<string, unknown>} */ (entry);
    const id = normalizeSocialId(typeof record.id === 'string' ? record.id : '');
    if (id) form[id] = typeof record.url === 'string' ? record.url : '';
  }

  return form;
}

/** @param {Record<string, string>} form */
export function socialFormToLinks(form) {
  const links = [];

  for (const id of SOCIAL_NETWORK_IDS) {
    const url = (form[id] ?? '').trim();
    if (!url) continue;
    if (!isValidSocialUrlForNetwork(id, url)) return { links: [], invalidId: id };
    links.push({ id, url });
  }

  return { links, invalidId: '' };
}
