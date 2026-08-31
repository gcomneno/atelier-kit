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

### Canonical source and presentation authority

English (`en`) is the canonical source language for Atelier-Kit-owned UI and
CLI/operator presentation strings. Other deterministic catalogs, such as
Italian, are derived presentation representations, not parallel semantic
authorities.

Language selection changes presentation only. It MUST NOT change domain
semantics, structured results, validation behavior, exit-code meaning,
authorization, mutations, persistence or runtime authority.

Static UI/CLI localization remains deterministic and catalog-based.
Missing or unsupported localized presentation falls back deterministically to
canonical English.

GiadaWare AI translation is an OPTIONAL provider-independent semantic
capability for genuinely dynamic human-readable presentation only. Atelier-Kit
must not depend on Ollama, models, provider SDKs, endpoints or
provider-specific translation mechanics. No current runtime AI translation
integration is justified. Translation output is derived presentation data and
never application authority. The provider-independent contract is owned by
GiadaWare AI:

https://github.com/gcomneno/giadaware-ai/blob/main/docs/TRANSLATION-CONTRACT.md

Repository-specific exceptions:

- client-authored config/content YAML;
- scaffold/starter locale packs that intentionally generate authoritative
  client-language content;
- legal/editorial source material;
- educational examples or recipes where multilingual material is intentional;
- upstream/vendor/platform metadata;
- archival or compatibility material where language is part of the evidence or
  history.

### CLI and GUI parity

`site.language` is shared configuration. Studio language selection writes that
setting. Relevant operator CLI/scripts resolve it. Scaffold and wizard
`--language` may generate authoritative starter content/config for the selected
client language and is therefore not equivalent to runtime UI translation.

### Scope

| In scope | Out of scope (future) |
|---|---|
| Studio `/studio/*` UI | Multi-locale visitor sites (hreflang) |
| Visitor showcase UI labels (home, catalog, collections, news, item detail, errors) | Machine translation |
| Save/validation messages | RTL layout |
| Content Doctor output | Translating YAML content (titles, bodies) |
| `publish`, `content:validate` CLI banners | |

`site.language` drives operator UI **and** visitor-facing chrome labels via `visitor.*` keys in `src/lib/i18n/messages/`.

## Consequences

- Adding a locale = new `messages/{code}.js` file
- Scripts import from `src/lib/i18n/` via relative path (same as `item-presets.js`)
- Preset labels translated at display time, not in source data files
- Static UI/CLI strings keep English as canonical source and catalogs as
  deterministic presentation data
- Missing localized strings resolve to English before falling back to the key
- Runtime AI translation is not part of this ADR's implemented surface

## Related

- Epic [#57](https://github.com/gcomneno/atelier-kit/issues/57)
- [`docs/usage/studio.md`](../usage/studio.md)
- [`docs/usage/configuration.md`](../usage/configuration.md)
