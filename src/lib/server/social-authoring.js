import { parse, stringify } from 'yaml';
import {
  SOCIAL_NETWORK_IDS,
  isValidSocialUrlForNetwork,
  normalizeSocialId,
  socialFormToLinks,
  socialLinksToForm
} from '../social-networks.js';

export const SOCIAL_AUTHORING_PATH =
  'config/social.yaml';

export class SocialAuthoringDocumentError extends Error {
  constructor() {
    super('Social authoring document is invalid.');
    this.name = 'SocialAuthoringDocumentError';
    this.code = 'SOCIAL_AUTHORING_DOCUMENT_INVALID';
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * Read only the finite Social authoring field set from FormData.
 *
 * Non-string values are treated like the existing optional-field
 * behavior: absent/unsupported input becomes an empty value.
 *
 * @param {unknown} formData
 * @returns {Record<string, string>}
 */
export function socialFormValuesFromFormData(
  formData
) {
  if (
    formData === null ||
    typeof formData !== 'object' ||
    typeof /** @type {Record<string, unknown>} */ (
      formData
    ).get !== 'function'
  ) {
    throw new TypeError(
      'Social authoring requires FormData.'
    );
  }

  const reader =
    /** @type {{ get(name: string): unknown }} */ (
      formData
    );

  /** @type {Record<string, string>} */
  const values = {};

  for (const id of SOCIAL_NETWORK_IDS) {
    const value = reader.get(`url_${id}`);

    values[id] =
      typeof value === 'string'
        ? value.trim()
        : '';
  }

  return values;
}

/**
 * Build the one canonical Social document accepted from Studio.
 *
 * `invalidId` deliberately remains a domain result so Local and
 * Hosted HTTP adapters can provide their own safe localized error.
 *
 * @param {unknown} formData
 */
export function buildSocialAuthoringDocumentFromFormData(
  formData
) {
  const form =
    socialFormValuesFromFormData(formData);

  const {
    links,
    invalidId
  } = socialFormToLinks(form);

  return {
    form,
    invalidId,
    document:
      invalidId === ''
        ? {
            social: {
              links
            }
          }
        : null
  };
}

/**
 * Validate and canonicalize a parsed Social document.
 *
 * Repository-backed reads use this boundary instead of trusting
 * arbitrary YAML structure. Alias ids are normalized to canonical
 * ids and duplicate canonical ids are rejected as ambiguous.
 *
 * @param {unknown} input
 */
export function normalizeSocialAuthoringDocument(
  input
) {
  if (
    !isRecord(input) ||
    !isRecord(input.social) ||
    !Array.isArray(input.social.links)
  ) {
    throw new SocialAuthoringDocumentError();
  }

  /** @type {{ id: string, url: string }[]} */
  const links = [];
  const seen = new Set();

  for (const entry of input.social.links) {
    if (!isRecord(entry)) {
      throw new SocialAuthoringDocumentError();
    }

    const rawId =
      typeof entry.id === 'string'
        ? entry.id
        : '';

    const id = normalizeSocialId(rawId);

    const url =
      typeof entry.url === 'string'
        ? entry.url.trim()
        : '';

    if (
      !id ||
      !url ||
      !isValidSocialUrlForNetwork(
        /** @type {import('../social-networks.js').SocialNetworkId} */ (
          id
        ),
        url
      ) ||
      seen.has(id)
    ) {
      throw new SocialAuthoringDocumentError();
    }

    seen.add(id);
    links.push({ id, url });
  }

  return {
    document: {
      social: {
        links
      }
    },
    form: socialLinksToForm(links)
  };
}

/**
 * @param {string} content
 */
export function parseSocialAuthoringDocument(
  content
) {
  if (typeof content !== 'string') {
    throw new SocialAuthoringDocumentError();
  }

  try {
    return normalizeSocialAuthoringDocument(
      parse(content)
    );
  } catch (error) {
    if (
      error instanceof
      SocialAuthoringDocumentError
    ) {
      throw error;
    }

    throw new SocialAuthoringDocumentError();
  }
}

/**
 * @param {unknown} document
 */
export function serializeSocialAuthoringDocument(
  document
) {
  const normalized =
    normalizeSocialAuthoringDocument(document);

  return `${
    stringify(normalized.document).trim()
  }\n`;
}
