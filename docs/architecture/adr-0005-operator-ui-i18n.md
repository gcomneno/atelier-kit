# ADR 0005: Operator UI internationalization (i18n)

## Status

Accepted — Phase A/B implemented in v0.1.11 ([#57](https://github.com/gcomneno/atelier-kit/issues/57)).

## Context

Atelier-Kit targets artisans and small studios worldwide. Visitor content can already be written in any language, but the **operator UI** (studio, Content Doctor, CLI scripts) was English-only — blocking non-English operators from the no-code path.

ADR 0002 stated: *"Forms should map to user language, not YAML structure."*

## Decision

Use an **in-house message catalog** (no paraglide/svelte-i18n dependency):

```
src/lib/i18n/
  index.js              → translate(), createTranslator()
  resolve-locale.js     → en | it from site.language
  load-operator-locale.js → read config/site.yaml (scripts)
  messages/en.js
  messages/it.js
```

### Locale resolution

1. `config/site.yaml` → `site.language` (e.g. `it`, `it-IT`, `italian`)
2. Fallback: `ATELIER_LOCALE` env var
3. Default: `en`

The same field drives `<html lang="…">` for visitors **and** operator UI locale.

### Scope

| In scope | Out of scope (future) |
|---|---|
| Studio `/studio/*` UI | Multi-locale visitor sites (hreflang) |
| Save/validation messages | Machine translation |
| Content Doctor output | RTL layout |
| `publish`, `content:validate` CLI banners | |

## Consequences

- Adding a locale = new `messages/{code}.js` file
- Scripts import from `src/lib/i18n/` via relative path (same as `item-presets.js`)
- Preset labels translated at display time, not in source data files

## Related

- Epic [#57](https://github.com/gcomneno/atelier-kit/issues/57)
- [`docs/usage/studio.md`](../usage/studio.md)
- [`docs/usage/configuration.md`](../usage/configuration.md)
