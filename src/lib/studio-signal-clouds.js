/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {FormDataEntryValue | null} value
 * @param {unknown} fallback
 */
function formString(value, fallback = '') {
  return typeof value === 'string'
    ? value.trim()
    : typeof fallback === 'string'
      ? fallback
      : '';
}

/**
 * @param {FormDataEntryValue | null} value
 */
function checkboxEnabled(value) {
  return value === 'on' || value === 'true' || value === '1';
}

/**
 * Valid integers become numbers.
 * Invalid values remain strings so structural validation can report them.
 *
 * @param {FormDataEntryValue | null} value
 * @param {unknown} fallback
 * @returns {number | string | undefined}
 */
function optionalOrder(value, fallback) {
  if (typeof value !== 'string') {
    return typeof fallback === 'number' || typeof fallback === 'string'
      ? fallback
      : undefined;
  }

  const normalized = value.trim();

  if (normalized === '') {
    return undefined;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized;
}

/**
 * @param {unknown[]} originalClouds
 * @param {FormData} formData
 */
export function applySignalCloudsFromForm(originalClouds, formData) {
  if (!Array.isArray(originalClouds)) {
    return [];
  }

  return originalClouds.map((cloudValue, cloudIndex) => {
    if (!isRecord(cloudValue)) {
      return cloudValue;
    }

    const cloud = cloudValue;
    const existingFaq = isRecord(cloud.faq) ? cloud.faq : {};

    const answer = formString(
      formData.get(`cloud_${cloudIndex}_faq_answer`),
      existingFaq.answer
    );
    const group = formString(
      formData.get(`cloud_${cloudIndex}_faq_group`),
      existingFaq.group
    );
    const order = optionalOrder(
      formData.get(`cloud_${cloudIndex}_faq_order`),
      existingFaq.order
    );
    const visible = checkboxEnabled(
      formData.get(`cloud_${cloudIndex}_faq_visible`)
    );

    /** @type {Record<string, unknown>} */
    const faq = {
      ...existingFaq,
      visible
    };

    if (answer !== '') {
      faq.answer = answer;
    } else {
      delete faq.answer;
    }

    if (group !== '') {
      faq.group = group;
    } else {
      delete faq.group;
    }

    if (order !== undefined) {
      faq.order = order;
    } else {
      delete faq.order;
    }

    const hasCustomFaqFields = Object.keys(faq).some(
      (key) => !['visible', 'answer', 'group', 'order'].includes(key)
    );
    const hasFaqContent =
      visible ||
      answer !== '' ||
      group !== '' ||
      order !== undefined ||
      hasCustomFaqFields;

    /** @type {Record<string, unknown>} */
    const updated = {
      ...cloud,
      enabled: checkboxEnabled(formData.get(`cloud_${cloudIndex}_enabled`)),
      question: formString(
        formData.get(`cloud_${cloudIndex}_question`),
        cloud.question
      ),
      hint: formString(
        formData.get(`cloud_${cloudIndex}_hint`),
        cloud.hint
      ),
      options: Array.isArray(cloud.options)
        ? cloud.options.map((optionValue, optionIndex) => {
            if (!isRecord(optionValue)) {
              return optionValue;
            }

            return {
              ...optionValue,
              label: formString(
                formData.get(
                  `cloud_${cloudIndex}_option_${optionIndex}_label`
                ),
                optionValue.label
              )
            };
          })
        : []
    };

    if (hasFaqContent) {
      updated.faq = faq;
    } else {
      delete updated.faq;
    }

    return updated;
  });
}

/**
 * Builds the editable Signal Cloud rows exposed to the Studio page.
 *
 * Legacy clouds without faq receive form-safe defaults without modifying YAML.
 *
 * @param {unknown[]} clouds
 */
export function getStudioSignalCloudRows(clouds) {
  if (!Array.isArray(clouds)) {
    return [];
  }

  return clouds
    .filter((cloud) => isRecord(cloud))
    .map((cloud) => {
      const faq = isRecord(cloud.faq) ? cloud.faq : {};

      return {
        id: formString(null, cloud.id),
        enabled: cloud.enabled !== false,
        question: formString(null, cloud.question),
        hint: formString(null, cloud.hint),
        faq: {
          visible: faq.visible === true,
          answer: formString(null, faq.answer),
          group: formString(null, faq.group),
          order:
            typeof faq.order === 'number' || typeof faq.order === 'string'
              ? String(faq.order)
              : ''
        },
        options: Array.isArray(cloud.options)
          ? cloud.options
              .filter((option) => isRecord(option))
              .map((option) => ({
                id: formString(null, option.id),
                label: formString(null, option.label)
              }))
          : []
      };
    });
}
