/**
 * @param {FormDataEntryValue | null} value
 */
export function checkboxEnabled(value) {
  return value === 'on' || value === 'true' || value === '1';
}
