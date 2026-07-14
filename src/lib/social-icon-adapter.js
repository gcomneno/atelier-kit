import { normalizeSocialId } from './social-networks.js';

/**
 * Keep the package's wider registry behind Atelier-Kit's four-network contract.
 *
 * @param {string} id
 * @returns {import('giadaware-ui-components').SocialIconId | ''}
 */
export function resolveAtelierSocialIconId(id) {
  return /** @type {import('giadaware-ui-components').SocialIconId | ''} */ (
    normalizeSocialId(id)
  );
}
