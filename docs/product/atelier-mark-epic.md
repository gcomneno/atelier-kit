# Atelier Mark — epic and issues

> Historical planning document. The decorative `tagline_display` epigraph/quote-color
> feature described below was retired by #192; it is no longer an active product capability.

Editorial **inline token markup** for showcase text fields (Level 2 product direction).

- **ADR:** [`docs/adr/0008-atelier-mark-editorial-inline-tokens.md`](../adr/0008-atelier-mark-editorial-inline-tokens.md)
- **Working name:** Atelier Mark
- **Target release:** v0.2.0 (tentative)

## Problem

Operators need to emphasize words or phrases in taglines and hero copy using **theme colors** (e.g. accent gold on body text, dark guillemets) without CSS, HTML, or a full rich-text editor.

Today all site strings are plain text; `.hero-epigraph` adds guillemets in CSS only and cannot split colors within one line.

## Goal

A non-programmer can highlight text in Studio with toolbar buttons; saved YAML stays readable; visitor site renders safe `<span class="mark-*">` mapped to appearance tokens; invalid markup is rejected at save time.

## GitHub tracking

| Item | Issue | Status |
|------|-------|--------|
| **Epic — Atelier Mark v1** | [#103](https://github.com/gcomneno/atelier-kit/issues/103) | Open |
| 1. Parser + unit tests | [#104](https://github.com/gcomneno/atelier-kit/issues/104) | Open |
| 2. `EditorialText` visitor component | [#105](https://github.com/gcomneno/atelier-kit/issues/105) | Open |
| 3. Tagline + intro_title visitor wiring | [#106](https://github.com/gcomneno/atelier-kit/issues/106) | Open |
| 4. Studio `EditorialField` + Identity UI | [#107](https://github.com/gcomneno/atelier-kit/issues/107) | Open |
| 5. `tagline_display` epigraph wrap | [#108](https://github.com/gcomneno/atelier-kit/issues/108) | Open |
| 6. `hero_intro` markup support | [#109](https://github.com/gcomneno/atelier-kit/issues/109) | Open |
| 7. Content Doctor + operator docs | [#110](https://github.com/gcomneno/atelier-kit/issues/110) | Open |

Issues created 2026-07-08.

---

## Epic — template (GitHub)

**Title:** Epic: Atelier Mark v1 — editorial inline tokens

**Labels:** `enhancement`

**Body:**

```markdown
## Summary

Safe inline emphasis for editorial site fields using theme tokens — not CSS, not HTML, not Markdown.

ADR: `docs/adr/0008-atelier-mark-editorial-inline-tokens.md`
Product doc: `docs/product/atelier-mark-epic.md`

## Goal

Operators highlight phrases in tagline / intro copy from Studio; visitor site renders token-colored spans; invalid markup fails at save.

## Child issues

- [ ] Parser + unit tests (`editorial-markup.js`)
- [ ] Visitor `EditorialText` component
- [ ] Wire `tagline` + `intro_title` on home layout
- [ ] Studio `EditorialField` (toolbar + preview) on Identity
- [ ] `tagline_display` epigraph wrap + quote color (Club use case)
- [ ] `hero_intro` paragraph markup
- [ ] Content Doctor rules + usage docs / recipe

## Syntax (v1)

| Markup | Token |
|--------|-------|
| `{accent}…{/accent}` | `--site-accent-color` |
| `{intro}…{/intro}` | `--site-intro-title-color` |
| `{heading}…{/heading}` | `--site-heading-color` |
| `{muted}…{/muted}` | muted text |

Literal `{` → `{{`. No nesting in v1.

## Out of scope

- Arbitrary CSS / hex colors
- HTML or Markdown in site identity fields
- Item/news long-form bodies (v1)
- WYSIWYG contenteditable
- i18n of tag names (tags stay English API)

## Success criteria

- [ ] Club tagline: dark `« »`, accent-colored body, no duplicate guillemets
- [ ] Plain strings without `{` unchanged
- [ ] Studio rejects unclosed/unknown tags with clear message
- [ ] `npm run content:doctor` reports editorial markup issues
- [ ] Operator doc with 3 examples and toolbar screenshot description
```

---

## Child issue sketches

### 1 — Parser + tests

**Title:** feat(editorial): Atelier Mark parser and token registry

- `parseEditorialMarkup(text)` → `{ ok, html, errors[] }`
- Whitelist tags, escape `{{`, no nesting, paragraph boundaries for multiline
- Vitest or node:test coverage

### 2 — EditorialText component

**Title:** feat(visitor): EditorialText component for safe rendered markup

- Props: `value`, optional `display` (wrap / quote_color)
- Emits only `mark-*` spans (+ epigraph wrapper when display set)

### 3 — Home wiring

**Title:** feat(visitor): apply Atelier Mark to tagline and intro_title

- Replace plain interpolation in `+page.svelte`
- Migrate off `.hero-epigraph::before/after` when `tagline_display.wrap: epigraph`

### 4 — Studio EditorialField

**Title:** feat(studio): EditorialField toolbar on Identity page

- Insert tags around selection; live preview; save validation hook

### 5 — Epigraph display

**Title:** feat(editorial): tagline_display epigraph wrap and quote_color

- YAML schema in `showcase.js` / `studio-site-server.js`
- Studio dropdowns: wrap none | epigraph; quote color token

### 6 — hero_intro

**Title:** feat(editorial): Atelier Mark on hero_intro paragraphs

- Per-paragraph parse; preserve `splitParagraphs` behaviour where used

### 7 — Doctor + docs

**Title:** docs(editorial): Atelier Mark operator guide and content-doctor rules

- `docs/usage/editorial-markup.md` or section in studio.md
- Recipe: Club epigraph tagline

---

## Upgrade notes (for client sites)

- Sites without markup: **no change** after upgrade.
- Custom preserved `+page.svelte` (e.g. Nero Quotidiano): must adopt `EditorialText` manually or markup in YAML will show raw `{accent}` text.
- `site:upgrade` should add new lib files; Identity page updates apply unless listed in `.atelier-kit-preserve`.

## Reference example (Club)

```yaml
site:
  tagline: "{accent}Narrativa breve e seriale tra la satira ed il surreale.{/accent}"
  tagline_display:
    wrap: epigraph
    quote_color: text
```

Visitor (conceptual):

```html
<p class="tagline">
  <span class="epigraph-quote mark-text">«</span>
  <span class="mark-accent">Narrativa breve e seriale tra la satira ed il surreale.</span>
  <span class="epigraph-quote mark-text">»</span>
</p>
```

(Class names are illustrative — final names defined in implementation PR.)
