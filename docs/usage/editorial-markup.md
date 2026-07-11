# Atelier Mark — editorial inline tokens

**Atelier Mark** lets operators emphasize words in short site texts using **theme colors and registered font presets**, not CSS or HTML.

ADR: [`docs/adr/0008-atelier-mark-editorial-inline-tokens.md`](../adr/0008-atelier-mark-editorial-inline-tokens.md)

## Where it works (v1)

Studio → **Site identity**:

- Tagline (with optional epigraph guillemets)
- Intro title
- Home intro text (per paragraph)

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

### Example (Club-style tagline)

```yaml
site:
  tagline: "{accent}Narrativa breve e seriale tra la satira ed il surreale.{/accent}"
  tagline_display:
    wrap: epigraph
    quote_color: text
```

Visitor: dark `« »`, accent-colored body, no duplicate guillemets.

## Studio

Use the toolbar buttons and font selector above tagline / intro fields to wrap the selection. Preview shows the result with your current appearance preset and loads only the Google Fonts used in its markup.

Open **Studio → Help** (`/studio/help`) for a short operator summary in the studio UI.

**Guillemets** (tagline only):

- *Theme default* — legacy CSS guillemets on `.hero-epigraph`
- *Epigraph quotes* — component-managed `« »` with separate quote color

## Validation

- Studio **Save** fails on invalid markup
- `npm run content:doctor` warns before publish

## Out of scope (v1)

- Item/news bodies
- Custom hex colors or HTML
- Custom font names, URLs or CSS
- Nested tags
