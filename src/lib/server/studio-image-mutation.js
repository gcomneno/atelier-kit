import { translate } from '../i18n/index.js';
import { checkboxEnabled } from './studio-form-values.js';

/**
 * Normalize and validate one Studio image upload/removal pair.
 * @param {FormData} formData
 * @param {string} uploadName
 * @param {string} removeName
 * @param {string} [locale]
 */
export function readImageMutation(formData, uploadName, removeName, locale = 'en') {
  const candidate = formData.get(uploadName);
  const upload = candidate instanceof File && candidate.size > 0 ? candidate : null;
  const remove = checkboxEnabled(formData.get(removeName));

  if (upload && remove) {
    throw new Error(translate('errors.imageUploadRemoveConflict', locale));
  }

  return { upload, remove, hasUpload: upload !== null };
}
