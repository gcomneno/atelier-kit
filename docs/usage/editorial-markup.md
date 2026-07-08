# Atelier Mark — editorial inline tokens

**Atelier Mark** lets operators emphasize words in short site texts using **theme colors**, not CSS or HTML.

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

- Literal braces: `{{` and `}}`
- **No nesting** in v1
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

Use the toolbar buttons above tagline / intro fields to wrap the selection. Preview shows the result with your current appearance preset.

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
- Nested tags
