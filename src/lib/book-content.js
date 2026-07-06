import { isReadingFormat } from '$lib/reading-formats.js';

const MONTHS =
  /^(?:\d{1,2}\s+)?(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?\.?$/i;

/**
 * @typedef {{
 *   type: 'lead' | 'intro' | 'section-title' | 'chapter-title' | 'epigraph' | 'dateline' | 'paragraph' | 'dialogue' | 'staccato' | 'ornament' | 'cta' | 'note',
 *   text?: string,
 *   dropCap?: boolean
 * }} BookBlock
 */

function normalizeParagraphs(body) {
  return body
    .trim()
    .split(/\n\s*\n/)
    .flatMap((paragraph) => {
      const trimmed = paragraph.trim();

      if (!trimmed.includes('\n')) {
        return [trimmed];
      }

      return trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    });
}

/**
 * @param {string} body
 * @returns {BookBlock[]}
 */
export function parseBookContent(body) {
  const paragraphs = normalizeParagraphs(body);

  /** @type {BookBlock[]} */
  const blocks = [];
  let inChapterOpen = true;
  let dropCapPending = false;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const text = paragraphs[index];

    if (text === '—' || text === '–') {
      blocks.push({ type: 'ornament' });
      const hasChapterContent = blocks.some(
        (block) =>
          block.type === 'paragraph' ||
          block.type === 'dialogue' ||
          block.type === 'staccato'
      );

      if (!hasChapterContent) {
        inChapterOpen = true;
      }

      dropCapPending = false;
      continue;
    }

    if (isFooterText(text)) {
      blocks.push({
        type: /amazon\.it|https?:\/\//i.test(text) ? 'cta' : 'note',
        text
      });
      continue;
    }

    if (index === 0) {
      blocks.push({ type: 'lead', text });
      continue;
    }

    if (isDateline(text)) {
      blocks.push({ type: 'dateline', text });
      inChapterOpen = false;

      if (MONTHS.test(text.trim())) {
        dropCapPending = true;
      }

      continue;
    }

    if (inChapterOpen) {
      if (/^«.+»\.?$/.test(text)) {
        blocks.push({ type: 'epigraph', text });
        continue;
      }

      if (isSectionTitle(text)) {
        blocks.push({ type: 'section-title', text });
        continue;
      }

      if (isChapterTitle(text)) {
        blocks.push({ type: 'chapter-title', text });
        continue;
      }

      if (text.length > 60) {
        blocks.push({ type: 'intro', text });
        continue;
      }
    }

    if (isDialogue(text)) {
      blocks.push({ type: 'dialogue', text });
      dropCapPending = false;
      continue;
    }

    if (!inChapterOpen && isStaccato(text) && !dropCapPending) {
      blocks.push({ type: 'staccato', text });
      dropCapPending = false;
      continue;
    }

    blocks.push({
      type: 'paragraph',
      text,
      dropCap: dropCapPending
    });
    dropCapPending = false;
    inChapterOpen = false;
  }

  return blocks;
}

/**
 * @param {string | undefined} readingFormat
 * @param {string} id
 */
export function isBookReadingFormat(readingFormat, id) {
  if (isReadingFormat(readingFormat)) {
    return true;
  }

  return /-(?:estratto|anteprima)$/.test(id) || id.includes('-in-lavorazione');
}

/**
 * @param {string} text
 */
function isFooterText(text) {
  return (
    /nessun acquisto/i.test(text) ||
    /amazon\.it|https?:\/\//i.test(text) ||
    /edizione definitiva|Testo in bozza|già disponibile nella collana/i.test(text)
  );
}

/**
 * @param {string} text
 */
function isDateline(text) {
  const trimmed = text.trim();

  if (MONTHS.test(trimmed)) {
    return true;
  }

  if (trimmed.length > 80 || /[.!?]$/.test(trimmed)) {
    return false;
  }

  return /^[A-ZÀ-ÖØ-Þ][^,]{1,35},\s/.test(trimmed);
}

/**
 * @param {string} text
 */
function isSectionTitle(text) {
  return text.includes('—') && text.length < 90 && !/[.!?]$/.test(text.trim());
}

/**
 * @param {string} text
 */
function isChapterTitle(text) {
  if (text.length > 48 || text.includes(',') || text.includes('.')) {
    return false;
  }

  return text.split(/\s+/).length <= 5;
}

/**
 * @param {string} text
 */
function isDialogue(text) {
  if (/^[«""]/.test(text)) {
    return true;
  }

  if (/^["']/.test(text) && text.length < 220) {
    return true;
  }

  return text.length < 90 && /^[«""]/.test(text.trim());
}

/**
 * @param {string} text
 */
function isStaccato(text) {
  if (text.length > 52 || text.includes(',') || text.includes('«') || text.includes('"')) {
    return false;
  }

  const words = text.split(/\s+/).length;

  return words <= 9;
}

/**
 * @param {string} text
 */
export function linkifyPlainText(text) {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);

  if (!urlMatch || urlMatch.index === undefined) {
    return { before: text, url: null, after: '' };
  }

  const url = urlMatch[1];
  const before = text.slice(0, urlMatch.index);
  const after = text.slice(urlMatch.index + url.length);

  return { before, url, after };
}
