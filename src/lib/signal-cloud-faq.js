/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Projects eligible public FAQ entries from Signal Cloud records.
 *
 * Eligibility:
 * - cloud.enabled === true
 * - cloud.faq.visible === true
 * - non-empty question
 * - non-empty FAQ answer
 *
 * Entries with an integer order appear first in ascending order.
 * Equal or missing orders preserve the original Signal Cloud position.
 *
 * @param {unknown[]} clouds
 * @returns {Array<{
 *   id: string,
 *   question: string,
 *   answer: string,
 *   group?: string,
 *   order?: number
 * }>}
 */
export function projectFaqEntries(clouds) {
  if (!Array.isArray(clouds)) {
    return [];
  }

  return clouds
    .map((cloud, sourceIndex) => {
      if (!isRecord(cloud) || cloud.enabled !== true || !isRecord(cloud.faq)) {
        return null;
      }

      const faq = cloud.faq;
      const id = cleanString(cloud.id);
      const question = cleanString(cloud.question);
      const answer = cleanString(faq.answer);
      const group = cleanString(faq.group);
      const order =
      typeof faq.order === 'number' && Number.isInteger(faq.order)
        ? faq.order
        : undefined;

      if (faq.visible !== true || question === '' || answer === '') {
        return null;
      }

      return {
        sourceIndex,
        entry: {
          id,
          question,
          answer,
          ...(group !== '' ? { group } : {}),
          ...(order !== undefined ? { order } : {})
        }
      };
    })
    .filter((item) => item !== null)
    .sort((left, right) => {
      const leftOrder = left.entry.order;
      const rightOrder = right.entry.order;

      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
      }

      if (leftOrder !== undefined) {
        return -1;
      }

      if (rightOrder !== undefined) {
        return 1;
      }

      return left.sourceIndex - right.sourceIndex;
    })
    .map((item) => item.entry);
}

/**
 * Builds the schema.org FAQPage representation for public FAQ entries.
 *
 * Group and order are presentation metadata and are intentionally omitted
 * from JSON-LD.
 *
 * @param {Array<{ question: string, answer: string }>} entries
 * @param {string} url
 * @returns {{
 *   '@context': string,
 *   '@type': string,
 *   url: string,
 *   mainEntity: Array<{
 *     '@type': string,
 *     name: string,
 *     acceptedAnswer: {
 *       '@type': string,
 *       text: string
 *     }
 *   }>
 * }}
 */
export function buildFaqPageSchema(entries, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer
      }
    }))
  };
}
