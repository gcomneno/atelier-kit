/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Returns FAQ validation issues shared by Studio pre-write checks and
 * scripts/validate-content.js.
 *
 * @param {unknown[]} clouds
 * @returns {{ key: string, cloudId: string }[]}
 */
export function getSignalCloudFaqIssues(clouds) {
  if (!Array.isArray(clouds)) {
    return [];
  }

  const issues = [];

  for (const cloud of clouds) {
    if (!isRecord(cloud) || cloud.faq === undefined) {
      continue;
    }

    const cloudId =
      typeof cloud.id === 'string' && cloud.id.trim() !== ''
        ? cloud.id
        : '(unknown)';
    const faq = cloud.faq;

    if (!isRecord(faq)) {
      issues.push({
        key: 'cloudFaqMustBeObject',
        cloudId
      });
      continue;
    }

    if ('visible' in faq && typeof faq.visible !== 'boolean') {
      issues.push({
        key: 'cloudFaqVisibleMustBeBoolean',
        cloudId
      });
    }

    if (faq.visible === true) {
      if (typeof faq.answer !== 'string' || faq.answer.trim() === '') {
        issues.push({
          key: 'cloudFaqAnswerRequired',
          cloudId
        });
      }
    } else if (
      'answer' in faq &&
      faq.answer !== undefined &&
      typeof faq.answer !== 'string'
    ) {
      issues.push({
        key: 'cloudFaqAnswerMustBeString',
        cloudId
      });
    }

    if (
      'group' in faq &&
      faq.group !== undefined &&
      typeof faq.group !== 'string'
    ) {
      issues.push({
        key: 'cloudFaqGroupMustBeString',
        cloudId
      });
    }

    const order = faq.order;

    if (
      'order' in faq &&
      order !== undefined &&
      (typeof order !== 'number' || !Number.isInteger(order) || order < 0)
    ) {
      issues.push({
        key: 'cloudFaqOrderMustBeInteger',
        cloudId
      });
    }
  }

  return issues;
}
