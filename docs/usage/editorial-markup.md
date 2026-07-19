# Atelier Mark — editorial inline tokens

**Atelier Mark** lets operators emphasize words in short site texts using **theme colors and registered font presets**, not CSS or HTML.

ADR: [`docs/adr/0008-atelier-mark-editorial-inline-tokens.md`](../adr/0008-atelier-mark-editorial-inline-tokens.md)

## Where it works (v1)

Studio → **Site identity**:

- Tagline
- Intro title
- Home intro text (per paragraph)
- Multiline hero signature (validated per paragraph and rendered in its existing single signature element)

Plain text without `{` is unchanged.

## Syntax

| Markup | Visitor color |
|--------|----------------|
| `{accent}…{/accent}` | Accent (`--site-accent-color`) |
| `{intro}…{/intro}` | Intro title color |
| `{heading}…{/heading}` | Heading color |
| `{muted}…{/muted}` | Muted text |
| `{font:fraunces}…{/font}` | Fraunces font preset |

Font IDs are exactly the presets from Site appearance: `system`, `inter`, `source-serif`, `fraunces`, `dm-sans`, `lora`. Inline fonts override the site-wide font only for the wrapped text. `system` uses the device sans-serif and makes no external request; Google Fonts are loaded only for presets actually used by the site-wide setting or inline markup. URLs, free-form family names, CSS and unknown presets are rejected.

- Literal braces: `{{` and `}}`
- **No nesting**, including between color and font tags
- Unknown or unclosed tags are rejected on save

### Example

```yaml
site:
  tagline: "{accent}Narrativa breve e seriale tra la satira ed il surreale.{/accent}"
```

## Studio

Use the toolbar buttons and font selector above tagline / intro fields to wrap the selection. Preview shows the result with your current appearance preset and loads only the Google Fonts used in its markup.

Open **Studio → Help** (`/studio/help`) for a short operator summary in the studio UI.

## Validation

- Studio **Save** fails on invalid markup
- `npm run content:doctor` warns before publish

## Out of scope (v1)

- Item/news bodies
- Custom hex colors or HTML
- Custom font names, URLs or CSS
- Nested tags

## Legacy tagline display configuration

`tagline_display.wrap` and `tagline_display.quote_color` are retired. Existing YAML files
that still contain them continue to load: the visitor and Studio ignore the object, and a
normal Studio save leaves it untouched instead of rewriting client-owned legacy data. New
scaffolds do not generate it. It can be removed manually whenever that file is next reviewed.
