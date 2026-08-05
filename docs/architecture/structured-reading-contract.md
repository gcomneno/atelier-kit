# Structured-reading contract

This document records the public structured-reading design introduced by Atelier-Kit #234. The behavioral baseline that preceded this design is documented in [`structured-reading-characterization.md`](structured-reading-characterization.md).

## Goals

The subsystem provides one Atelier-Kit-owned reader for long-form editorial content while keeping these concerns separate:

1. explicit, product-neutral structured content;
2. defensive runtime normalization;
3. legacy free-form text compatibility;
4. accessible and responsive rendering;
5. client-controlled presentation through documented CSS custom properties.

The public contract does not infer roles from titles, genres, installment markers, brand names, known phrases or other product-specific vocabulary.

## Content contract

A news post may declare a non-empty `reading_blocks` array alongside its legacy `body`:

```yaml
reading_format: book
body: |
  Legacy fallback text.

reading_blocks:
  - type: colophon
    role: title
    text: Neutral publication title

  - type: colophon
    role: author
    text: Neutral author

  - type: ornament

  - type: chapter-title
    text: Chapter One

  - type: paragraph
    text: Opening chapter paragraph.
    drop_cap: true
```

`body` remains required. It is the compatibility fallback for existing posts and for explicit input that produces no readable canonical blocks at runtime.

### Supported block types

The public block types are:

```text
lead
intro
section-title
chapter-title
epigraph
dateline
paragraph
dialogue
staccato
ornament
cta
note
colophon
```

Every block except `ornament` requires a non-empty `text` string.

`drop_cap` is optional, must be boolean and is valid only on `paragraph`.

`role` is valid only on `colophon`.

### Colophon roles

The supported generic colophon roles are:

```text
title
series
author
imprint
body
epigraph
tagline
```

Blocks retain their declared order. The contract does not reorder roles or require every role to be present.

An `ornament` may follow colophon blocks and precede ordinary chapter content. It remains the same neutral separator used by legacy reading content.

## Authoring validation

`npm run content:validate` rejects:

- a non-array `reading_blocks` value;
- an empty `reading_blocks` array;
- non-object entries;
- unsupported block types;
- missing, blank or unsupported colophon roles;
- missing or blank text on blocks other than `ornament`;
- non-boolean `drop_cap`;
- `drop_cap` on blocks other than `paragraph`;
- `role` on blocks other than `colophon`.

Validation is intentionally stricter than runtime normalization. Authoring errors should be corrected before publication, while the visitor renderer must still degrade safely if malformed data reaches it through another path.

## Runtime normalization

`normalizeStructuredReadingBlocks()` is the canonical product-neutral normalizer.

It:

- trims readable text;
- preserves block order;
- returns only canonical properties;
- converts YAML `drop_cap` to runtime `dropCap`;
- removes unrelated properties;
- converts unknown but readable blocks or roles to ordinary paragraphs;
- converts isolated strings to paragraphs;
- omits empty and non-readable entries;
- never evaluates HTML or control syntax.

Unknown input therefore remains readable text rather than becoming active markup.

If an explicit array normalizes to zero blocks, `BookReading` falls back to the legacy `body`. A malformed or empty explicit array cannot make an otherwise readable published page blank.

## Legacy compatibility

`parseBookContent(body)` remains the compatibility adapter for existing free-form reading posts.

Its current heuristics continue to support:

- lead and introductory text;
- section and chapter titles;
- epigraphs and datelines;
- paragraphs, dialogue and staccato;
- ornaments and drop-cap scheduling;
- notes and CTA detection;
- `reading_format: book`;
- required legacy ID fallbacks.

These heuristics are not part of the new explicit contract.

The compatibility parser has no removal date in this change. Removing or deprecating it requires a separate, versioned decision after supported consumers have migrated and compatibility usage has been audited.

## Component boundary

`BookReading.svelte` remains the compatibility wrapper and canonical renderer.

Its public inputs remain:

- `post.title`;
- optional `post.excerpt`;
- required `post.body`;
- optional `post.reading_blocks`;
- optional `backHref`;
- required `backLabel`.

Selection order is:

1. normalize and render non-empty explicit `reading_blocks`;
2. otherwise parse and render legacy `body`.

The route-level `reading_format` selection remains unchanged.

Title, excerpt and explicit colophon text continue to render through `EditorialText`, retaining Atelier Mark behavior without injecting raw HTML.

CTA links remain limited to detected HTTP(S) URLs and use:

```html
target="_blank"
rel="noopener noreferrer"
```

## Semantics and accessibility

The reader retains:

- a `main` landmark;
- a labelled `article`;
- an `h1` edition title;
- semantic `h2` section and chapter headings;
- configurable back navigation;
- decorative ornaments hidden from assistive technology;
- readable text fallback for unknown or malformed input.

Colophon roles are exposed through product-neutral `data-colophon-role` attributes for testing and host styling. They do not replace semantic headings or introduce client vocabulary.

## Presentation contract

Hosts may override these CSS custom properties:

```css
--book-reading-colophon-color
--book-reading-colophon-title-color
--book-reading-colophon-muted-color
--book-reading-colophon-accent-color
```

Every property has an internal readable fallback. The accent property also falls back to `--site-accent-color`.

The public API favors these narrow CSS tokens over branded component variants.

## Upgrade boundary

The generic `site:upgrade` file plan installs the new canonical module even when a client temporarily preserves legacy copies of:

```text
src/lib/book-content.js
src/lib/components/BookReading.svelte
```

Preserved files remain byte-identical. No structured-reading-specific mutation logic is added to the upgrader.

Consumer adoption remains a separate change:

1. upgrade to a version containing the canonical contract;
2. express publishing roles through explicit neutral `reading_blocks`;
3. verify published reading pages and responsive behavior;
4. remove the two obsolete preserve entries;
5. rerun the audited site upgrade;
6. reconcile any stale client-owned tests separately;
7. keep unrelated client assets outside the adoption change.

## Reversibility

The design is intentionally narrow:

- `reading_blocks` is optional;
- legacy `body` remains required and readable;
- the normalizer is a pure module;
- `BookReading` preserves its existing route and props;
- presentation uses overridable tokens;
- consumer migration is separate from core implementation.

A consumer can therefore adopt the explicit contract incrementally without changing non-book news rendering or deleting its legacy fallback content.
