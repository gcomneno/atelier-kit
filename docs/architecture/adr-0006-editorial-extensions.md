# ADR 0006: Editorial extensions (news, footer, social, sidebar)

## Status

Proposed — epic tracked on GitHub (see issue link in commit / release notes).

## Context

Atelier-Kit targets small creative showcases: catalog, item pages, about, contact via Visitor Brief. Publisher and author use cases (e.g. *Ombre di Carta*) need **editorial** affordances without becoming a CMS, shop or newsletter platform.

A feasibility review (2026-07) concluded that a **faithful** full publisher mockup (cart, accounts, newsletter, magazine layout) is out of scope, but these extensions fit the file-based, YAML-driven model:

1. Minimal **news** (`content/news/`)
2. **Multi-column legal footer** (`config/footer.yaml`)
3. **Social links** in site header (`config/social.yaml` or `site.social`)
4. **Optional sidebar** with a small set of pre-built widgets (layout preset)

## Decision

Extend the showcase kit with **static, YAML-driven editorial features**. No database, no visitor accounts, no form backends, no page builder.

### In scope

| Feature | Model | Studio |
|---------|--------|--------|
| News | `content/news/*.yaml`, `/news`, `/news/[slug]` | Create/edit posts (title, date, body, optional image) |
| Footer | `config/footer.yaml` + static legal pages | Edit columns and links |
| Social | `config/social.yaml` or `site.social[]` | Edit URLs and visibility |
| Sidebar | `config/layout.yaml` or `site.layout` preset | Toggle widgets from fixed list |

### Fixed sidebar widgets (MVP)

- Collection links (from existing collections)
- About snippet (from `about.yaml`)
- Latest news (if news enabled)
- Optional: client-side search over items/news titles (phase 2)

### Out of scope

- Newsletter signup and mailing lists
- E-commerce, cart, accounts
- Comments on news
- Unlimited/custom widgets or drag-and-drop layout
- Full-text search engine

### Layout

- Default remains **single-column** (current sites unchanged).
- New preset e.g. `layout: catalog-sidebar` enables sidebar on catalog/home routes only.

## Consequences

- Adds content type parallel to items (news) — validation and doctor rules needed.
- Header/footer become shared layout components driven by config.
- i18n: operator strings for news and footer editing (en/it).
- Scaffold templates may gain optional news samples for `writing` template.

## Related

- [`docs/product/positioning.md`](../product/positioning.md)
- [`docs/client-intake.md`](../client-intake.md)
- Epic: [#61 editorial extensions](https://github.com/gcomneno/atelier-kit/issues/61)
- Child: [#62 news](https://github.com/gcomneno/atelier-kit/issues/62), [#63 footer](https://github.com/gcomneno/atelier-kit/issues/63), [#64 social](https://github.com/gcomneno/atelier-kit/issues/64), [#65 sidebar](https://github.com/gcomneno/atelier-kit/issues/65)
