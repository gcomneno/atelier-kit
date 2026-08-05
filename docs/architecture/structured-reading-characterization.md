# Structured-reading characterization

This note records the audited behavior frozen by Atelier-Kit #235 before the structured-reading work in Atelier-Kit #234. It uses the current core reader, the current news-detail integration, the read-only Nero Quotidiano fork, and its restore commit as evidence. Nero Quotidiano #8 is the downstream adoption work that follows the core change.

## Current core contract

The current `book-content.js` parser accepts free-form text. It trims and splits blank-line paragraphs, then also splits multiline paragraphs into trimmed lines. Its observable generic blocks are lead, intro, section title, chapter title, epigraph, dateline, paragraph, dialogue, staccato, ornament, note, and CTA. A month dateline schedules one drop cap for the next ordinary paragraph; a separator clears that schedule. `reading_format: book` is accepted, with the existing legacy ID fallbacks retained. The news detail route selects `BookReading` only for that predicate; other news retains its normal rendering.

`BookReading` provides a labelled `main` and `article`, a configurable back link, an `h1` label, and text blocks. Its title and excerpt use `EditorialText`, so supported Atelier Mark is rendered and unsafe markup is not injected. HTTP(S) CTA links are split from plain text and receive `target="_blank"` plus `rel="noopener noreferrer"`.

## Client compatibility delta

The client fork adds these generic publishing roles, in this order where present: title, series, author, imprint, body, epigraph, and tagline. They are not supported by the current core parser or renderer.

| Observed behavior | Classification for later core work |
| --- | --- |
| Colophon roles and their visual reading order | Generic publishing semantics |
| A colophon begins only after a product-specific installment-marker heuristic among the early lines | Client-specific compatibility heuristic |
| Within the colophon, author, series, imprint, tagline, and body are inferred from language- and product-specific prefixes, punctuation, length, and a known title phrase | Client-specific compatibility heuristic |
| A single em/en-dash separator ends colophon mode, emits the ordinary ornament, clears pending drop caps, and resumes ordinary chapter parsing | Generic transition behavior, although the start trigger is client-specific |
| Footer/CTA recognition runs before colophon classification | Compatibility behavior to preserve while migrating existing content |

The exact client-specific inference rules are evidence for a temporary adapter or migration only. They must not become the target public contract: future generic content needs explicit, neutral structure rather than phrases, brand markers, genre labels, or known-title matching.

## Later compatibility cases

The later #234 implementation must preserve these observable cases without designing the API in this issue:

- Current free-form core reading remains readable, including format selection and legacy IDs.
- Explicit generic colophon roles render in the stated semantic order: title, series, author, imprint, body, epigraph, tagline.
- A colophon can end at a separator and ordinary chapter content can follow it; separators still render as ornaments and reset drop-cap scheduling.
- Notes and safe HTTP(S) CTAs retain their current readable, safe treatment.
- Marked title and excerpt retain `EditorialText` and Atelier Mark behavior.
- Unknown or malformed future roles degrade to safe readable text, with no control syntax or raw HTML exposed as active markup.
- Non-book news keeps its current route and presentation.

Downstream adoption must eventually remove these two preserve entries from the client checkout:

```text
src/lib/book-content.js
src/lib/components/BookReading.svelte
```

That removal is deliberately outside #235 and #234; it belongs to Nero Quotidiano #8 after the core contract is available and published pages have been checked.
