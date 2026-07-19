# ADR 0008: Atelier Mark — editorial inline tokens

> Amendment (#192): the optional decorative tagline epigraph wrapping and quote-color
> contract recorded here has been retired. Existing keys are tolerated but ignored; the
> remaining token/parser decision stays in force.

## Status

**Proposed** — epic [#103](https://github.com/gcomneno/atelier-kit/issues/103); see [`docs/product/atelier-mark-epic.md`](../product/atelier-mark-epic.md).

## Context

Showcase operators (authors, small studios) need **micro-styling** on short editorial strings — taglines, intro titles, hero intros — without learning CSS or HTML.

### Example (Club dell'Assurdo)

Desired visitor output:

> « **Narrativa breve e seriale tra la satira ed il surreale.** »

- Guillemets (`« »`) in **text** color (dark)
- Body in **accent** color (gold)

### Current behaviour

- Site fields (`tagline`, `hero_intro`, …) are **plain text** rendered with `white-space: pre-line`.
- Tagline uses `.hero-epigraph`, which injects guillemets via CSS `::before` / `::after`.
- If the operator types `« … »` in YAML **and** the epigraph class is active, guillemets can **duplicate**.
- Only one `color` applies per element — no per-span styling.
- Appearance already exposes theme tokens (`--site-accent-color`, `--site-intro-title-color`, …) but they cannot be applied to arbitrary words inside a string.

### What we reject

| Approach | Why not |
|----------|---------|
| Raw `style=""` or arbitrary CSS in Studio | XSS risk, theme breakage, upgrade fragility |
| Full HTML in YAML | Same risks; operators become accidental developers |
| Full Markdown / rich text editor | Scope creep; links, headings, paste-from-Word problems |
| Unrestricted color picker (hex) | Breaks preset coherence and accessibility |

We need **Level 2** from the product brainstorm: *controlled inline highlights* — a small markup dialect mapped **only** to existing theme tokens.

## Decision

Introduce **Atelier Mark** (working name): a whitelist markup parser for editorial fields.

### Core rules

1. **Token-only styling** — markup names map to CSS variables already defined by `site-appearance` (no hex, no custom classes).
2. **Plain text in YAML** — markup stays human-readable in `config/site.yaml` and in git diffs.
3. **Strict parser** — unknown tags, unclosed tags, or excessive nesting → **Studio save error** (and Content Doctor warning).
4. **Safe HTML output** — parser emits only `<span class="mark-*">` (and optional epigraph wrapper elements). No `@html` of raw operator input.
5. **Retrocompatible** — strings without `{` render exactly as today (plain text path).

### Markup syntax (v1)

BBCode-style delimiters. Tag names are **English API** (not translated in Studio UI).

| Markup | Visitor class | CSS token |
|--------|---------------|-----------|
| `{accent}…{/accent}` | `.mark-accent` | `color: var(--site-accent-color)` |
| `{intro}…{/intro}` | `.mark-intro` | `color: var(--site-intro-title-color)` |
| `{heading}…{/heading}` | `.mark-heading` | `color: var(--site-heading-color)` |
| `{muted}…{/muted}` | `.mark-muted` | muted text mix on `--site-text-color` |

**Literal braces:** escape as `{{` and `}}`.

**Nesting (v1):** disallowed — at most one tag level; parser errors on nested tags.

**Multiline fields (`hero_intro`, `hero_signature`):** markup is validated **within each
paragraph** (split on blank lines); tags must not span paragraphs. This validation boundary
does not require separate DOM elements: `hero_signature` keeps its existing single `p` with
`white-space: pre-line`.

### Retired tagline display option

The original v1 design included an optional `tagline_display` epigraph wrapper and
separate quote color. Amendment #192 retired that product capability.

Existing `tagline_display.wrap` and `tagline_display.quote_color` keys are tolerated
for compatibility but ignored by Studio and visitor rendering. New scaffolds do not
generate them, and no separate display wrapper is part of the active contract.

### Fields in scope (v1)

| Field | Inline markup | Separate display wrapper |
|-------|---------------|--------------------------|
| `tagline` | yes | no |
| `intro_title` | yes | no |
| `hero_intro` | yes (per paragraph) | no |
| `hero_signature` | yes (multiline; validated per paragraph) | no |
| Item/news bodies | **out of scope v1** | — |

### Studio UX

The shared **`MarkedTextField`** control (input/textarea + toolbar) is available for the
supported Studio fields, including the multiline `hero_signature`:

- Buttons insert tags around selection: Accent, Intro, Heading, Muted.
- Live preview using current appearance tokens.
- Short help panel with 3–4 examples (not technical docs).

Save path: `validateEditorialMarkup()` before `writeProjectYaml`.

### Visitor rendering

The **`EditorialText`** component renders controlled markup. The home signature uses it in
the existing signature paragraph; no separate display wrapper is supported.

```svelte
<EditorialText value={text} class="tagline" />
```

- Calls `parseEditorialMarkup(text)` and emits only controlled Atelier Mark output.
- Replaces plain text interpolation in visitor fields that support Atelier Mark.
- No display wrapper is supported; legacy `tagline_display` data is tolerated but ignored as specified by amendment #192.

### Code layout

```
src/lib/editorial-markup.js           # parser, token registry, escape rules
src/lib/editorial-markup.test.js      # unit tests (edge cases, nesting, escape)
src/lib/components/EditorialText.svelte
src/lib/components/MarkedTextField.svelte  # Studio only
src/lib/server/validate-editorial.js  # used by studio-site-server + content-doctor
```

### Validation & doctor

- **Studio save:** fail with `errors.editorialMarkup` pointing to field + reason.
- **Content Doctor:** warnings for unknown tags in legacy content after upgrade (if we ever widen the whitelist).

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| Level 1 only (dropdown colors, no inline spans) | Insufficient for multi-color within one line |
| Markdown subset (`*emphasis*`) | Familiar but encourages links/headings; harder to map to theme tokens |
| WYSIWYG contenteditable | High complexity, paste bugs, accessibility cost |
| CSS custom properties in markup `{color:#ff0}` | Rejected — breaks preset model |

## Consequences

**Positive:**

- Operators get “smart inline styling” without code.
- Theme and upgrade safety preserved.
- Solves Club epigraph + accent body in one model.
- Parser is testable in isolation (no Svelte required).

**Negative:**

- New concept to document and support in handoff.
- Slight complexity in Studio forms and save validation.
- Custom client `+page.svelte` overrides (e.g. Nero Quotidiano) must adopt `EditorialText` or lose markup on preserved pages.
- v1 does not color arbitrary single words in long news bodies.

**Neutral:**

- Likely ships as **v0.2.0** (visible feature), not a patch release.
- The original epigraph-wrapper milestone was superseded by amendment #192.

## Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **1a** | Complete: parser, tests and `EditorialText` on supported identity fields |
| **1b** | Superseded by amendment #192: no epigraph display wrapper |
| **2** | Complete: multiline `hero_intro` and `hero_signature` with `MarkedTextField` in Studio Identity |
| **3** | Complete: Content Doctor rules and operator documentation |

## Related

- [ADR 0006 — Editorial extensions](../architecture/adr-0006-editorial-extensions.md) — news, footer, sidebar (content types)
- [`src/lib/site-appearance.js`](../../src/lib/site-appearance.js) — theme tokens
- Epic: [#103 Atelier Mark v1](https://github.com/gcomneno/atelier-kit/issues/103)
- Child issues: [#104](https://github.com/gcomneno/atelier-kit/issues/104)–[#110](https://github.com/gcomneno/atelier-kit/issues/110)
- Club use case: epigraph tagline with accent body, dark quotes
