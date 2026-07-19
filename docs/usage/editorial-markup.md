# Atelier Mark — editorial inline tokens

**Atelier Mark** lets operators emphasize words in short site texts using **theme colors and registered font presets**, not CSS or HTML.

ADR: [`docs/adr/0008-atelier-mark-editorial-inline-tokens.md`](../adr/0008-atelier-mark-editorial-inline-tokens.md)

## Where it works

Studio → **Site identity**:

- Tagline
- Intro title
- Home intro text (per paragraph)
- Multiline hero signature (validated per paragraph and rendered in its existing single signature element)

The same contract is used by every Studio field rendered with `MarkedTextField`, including
hero banner copy, catalog and collection copy, About, items, news, footer/layout labels,
contact labels and Signal Cloud editorial text. The canonical field-by-field list is
[`docs/architecture/marked-text-inventory.md`](../architecture/marked-text-inventory.md).

Plain text without `{` is unchanged.

## Syntax

| Markup | Visitor color |
|--------|----------------|
| `{accent}…{/accent}` | Accent (`--site-accent-color`) |
| `{intro}…{/intro}` | Intro title color |
| `{heading}…{/heading}` | Heading color |
| `{muted}…{/muted}` | Muted text |
| `{white}…{/white}` | Explicit white (`#fff`) |
| `{black}…{/black}` | Explicit black (`#000`) |
| `{larger}…{/larger}` | One controlled increase (`1.2em`) |
| `{smaller}…{/smaller}` | One controlled decrease (`0.85em`) |
| `{font:fraunces}…{/font}` | Fraunces font preset |

Font IDs are exactly the presets from Site appearance: `system`, `inter`, `source-serif`, `fraunces`, `dm-sans`, `lora`. Inline fonts override the site-wide font only for the wrapped text. `system` uses the device sans-serif and makes no external request; Google Fonts are loaded only for presets actually used by the site-wide setting or inline markup. URLs, free-form family names, CSS and unknown presets are rejected.

- Literal braces: `{{` and `}}`
- **No nesting**, including between color and font tags
- Unknown or unclosed tags are rejected on save
- Size tokens have one semantic level only: there are no numeric values or arbitrary sizes.
- White and black are explicit presets, not theme colors. The operator must check contrast against the chosen background.

### Example

```yaml
site:
  tagline: "{accent}Narrativa breve e seriale tra la satira ed il surreale.{/accent}"
```

## Studio

Use the toolbar buttons and font selector to format a non-empty selection. Preview and visitor both use `EditorialText` and the same parser/class mapping.

- An empty selection changes nothing and leaves commands disabled with an accessible instruction.
- A partial plain-text selection is wrapped while surrounding text is preserved.
- Applying the same token to its already marked inner text is a no-op.
- Applying a different token replaces the complete surrounding token; nesting is never produced.
- A selection inside a token is accepted only when it contains all of that token's inner text. Cutting inner text, a delimiter, `{{` or `}}` is rejected.
- A selection may contain plain text, complete tokens and complete escaped-brace pairs. Replacement removes only the included controlled delimiters and preserves the escaped source before applying one outer token.
- **Remove formatting** strips supported Atelier Mark tokens from the selection without deleting its text or decoding escaped braces. Selecting the complete field removes all supported markup.
- Incomplete or unknown markup is shown as an error, blocks save, and must be fixed before toolbar transformations continue.

Open **Studio → Help** (`/studio/help`) for a short operator summary in the studio UI.

## Validation

- Studio **Save** fails on invalid markup
- `npm run content:doctor` warns before publish
- Metadata, search, feeds, JSON-LD and accessible labels use the parser's safe plain projection. Invalid control delimiters are omitted while explicitly escaped braces remain visible.

## Limitations

- Item/news bodies
- Custom hex colors or HTML
- Custom font names, URLs or CSS
- Nested tags
- Arbitrary sizes or colors

## Legacy tagline display configuration

`tagline_display.wrap` and `tagline_display.quote_color` are retired. Existing YAML files
that still contain them continue to load: the visitor and Studio ignore the object, and a
normal Studio save leaves it untouched instead of rewriting client-owned legacy data. New
scaffolds do not generate it. It can be removed manually whenever that file is next reviewed.
