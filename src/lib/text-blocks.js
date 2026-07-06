/**
 * Split YAML multiline text into display paragraphs.
 * Blank lines separate paragraphs; single newlines inside a paragraph become spaces.
 *
 * @param {string | undefined | null} text
 * @returns {string[]}
 */
export function splitParagraphs(text) {
  if (!text?.trim()) {
    return [];
  }

  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}
