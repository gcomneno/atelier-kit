# Changelog

All notable changes to Atelier-Kit will be documented in this file.

## Unreleased

## v0.1.16 - 2026-07-05

### Fixed

- **`html lang` attribute**: `hooks.server.js` replaces `%lang%` in `app.html` from `site.language` (was left as literal `%lang%` on deployed sites).
- **Footer `mailto:` links** accepted in validation and studio save.

## v0.1.15 - 2026-07-05

### Added

- **Visitor-facing UI i18n**: public showcase labels (Collections, Catalog, back links, sidebar widgets, Visitor Brief shell) follow `site.language` (`en` / `it`) ([#66](https://github.com/gcomneno/atelier-kit/issues/66)).
- `useVisitorI18n()` context and `visitor.*` message catalog in `src/lib/i18n/`.

### Changed

- ADR 0005 and configuration docs updated: `site.language` drives operator UI and visitor UI labels (YAML content text remains author-written).

## v0.1.14 - 2026-07-05

Closes epic [#61](https://github.com/gcomneno/atelier-kit/issues/61) — editorial extensions for publisher-style showcases.

### Added

- **Social links in header** via `config/social.yaml`, `SiteHeader`, and studio editor ([#64](https://github.com/gcomneno/atelier-kit/issues/64)).
- **Multi-column footer** with legal page links and static `/legal/[slug]` routes ([#63](https://github.com/gcomneno/atelier-kit/issues/63)).
- **News posts** in `content/news/` with `/news` routes and studio CRUD ([#62](https://github.com/gcomneno/atelier-kit/issues/62)).
- **Optional catalog-sidebar layout** via `config/layout.yaml` and `CatalogSidebar` ([#65](https://github.com/gcomneno/atelier-kit/issues/65)).
- ADR 0006 documenting editorial extensions architecture.

## v0.1.13 - 2026-07-05

### Added

- Studio **Publish live** / **Metti online** on `/studio/readiness`: publish prep, Git commit/push for studio files, Vercel production deploy.
- **Atelier Desktop** Tauri MVP in `desktop/` ([#60](https://github.com/gcomneno/atelier-kit/issues/60)): folder picker, dev server lifecycle, studio webview, system tray.
- Studio **Help** / **Aiuto** page at `/studio/help` — access guide moved out of repeated page boxes.

## v0.1.12 - 2026-07-05

Closes [#59](https://github.com/gcomneno/atelier-kit/issues/59), [#58](https://github.com/gcomneno/atelier-kit/issues/58); partial delivery for [#52](https://github.com/gcomneno/atelier-kit/issues/52).

### Added

- Studio Signal Clouds: **Show on item pages** checkbox (`enabled`) and **Remove signal** with confirmation ([#59](https://github.com/gcomneno/atelier-kit/issues/59)).
- Public item pages filter disabled Signal Clouds via `getSignalClouds()`.
- i18n follow-up: Content Doctor warning bodies, `content:validate` messages, `site:wizard` prompts ([#58](https://github.com/gcomneno/atelier-kit/issues/58)).
- Scaffold locale packs (`scripts/scaffold-locales/`) with `--language it` for contact labels and site footer.
- Studio **Run publish prep** on `/studio/readiness` (validate, doctor, check, build) ([#52](https://github.com/gcomneno/atelier-kit/issues/52)).
- `desktop/README.md` documenting terminal-free packaging phases.

### Changed

- Service model docs: €50 setup-light tier and GitHub Sponsors donation path.

## v0.1.11 - 2026-07-05

Closes epic [#57](https://github.com/gcomneno/atelier-kit/issues/57) — operator UI internationalization (Phase A–C).

### Added

- In-house i18n catalog with English and Italian operator locales (`src/lib/i18n/`).
- ADR 0005 documenting locale resolution via `config/site.yaml` → `site.language`.
- Studio UI, save messages, Content Doctor shell, `publish` and `content:validate` output follow operator locale.

### Notes

- Content Doctor warning bodies for individual items remain English in some edge cases; full doctor i18n and Italian scaffold packs are follow-ups.
- Visitor-facing multi-locale sites remain out of scope.

## v0.1.10 - 2026-07-05

Phase 5 studio and tooling improvements (epic [#52](https://github.com/gcomneno/atelier-kit/issues/52) — partial).

### Added

- Studio: reorder collection items with up/down controls at `/studio/collections/[id]`.
- Studio: optional background image upload in Site appearance (saved to `static/images/site/`).
- Tauri desktop wrapper Phase 2 research spike at `docs/architecture/spike-tauri-desktop-phase2.md` ([#53](https://github.com/gcomneno/atelier-kit/issues/53)).

### Changed

- `npm run site:upgrade` detects kit version from git tag, CHANGELOG, or nearest tag + commit count ([#56](https://github.com/gcomneno/atelier-kit/issues/56)).

## v0.1.9 - 2026-07-05

Closes epic [#43](https://github.com/gcomneno/atelier-kit/issues/43) — repeatable client handoff and studio completion.

### Added

- Added studio flow to create new items at `/studio/items/new`.
- Added studio flow to create new collections at `/studio/collections/new`.
- Added `npm run site:upgrade` to sync `src/` and `scripts/` from a newer kit without touching client config, content or item photos.
- Added configurable site appearance (background presets and custom colors) editable from `/studio`.
- Redesigned public item detail page layout with portrait-friendly images and a dedicated Visitor Brief zone.
- Added recommended studio access guidance panel on `/studio` and `/studio/readiness`.
- Added operator handoff playbook at `docs/product/operator-handoff-playbook.md`.

### Changed

- Scaffold templates now ship publish-ready starter copy; fresh scaffolds trigger one Content Doctor note (placeholder image) instead of many text warnings.
- Contact email is disabled in scaffolds until the operator or wizard sets a real address.

## v0.1.8 - 2026-07-04

### Added

- Extended local studio with about page, catalog settings, Signal Cloud editing, item photo upload and publish readiness review.
- Added public `/about` page driven by `config/about.yaml`.
- Added `npm run publish` for validation, doctor, check, build and optional Vercel deploy.
- Added ADR 0003 and service package documentation for client delivery.
- Improved Visitor Brief prominence on item pages.
- Added `npm run studio:launch` to open the studio in the browser automatically.
- Added Vercel deploy button docs and `DEPLOY.md` generation for scaffolded client sites.
- Added ADR 0004 for desktop wrapper research (phase 1: studio launch helper).

## v0.1.7 - 2026-07-04

### Added

- Added studio item and collection editors at `/studio/items` and `/studio/collections`.

## v0.1.6 - 2026-07-04

### Added

- Added a local studio prototype for editing site identity and contact settings from `/studio`.
- Added `npm run studio` to start localhost-only authoring mode.

## v0.1.5 - 2026-07-04

### Added

- Improved Content Doctor messages with plain-language publishing notes and `--verbose` technical output.
- Added ADR 0002 documenting local studio architecture research for `npm run studio`.

## v0.1.4 - 2026-07-04

### Added

- Added product level documentation for developer-assisted, guided and no-code paths.
- Added a no-code roadmap documenting the staged authoring direction for epic #35.
- Added an interactive `site:wizard` guided setup command for new client sites.

## v0.1.3 - 2026-07-04

### Added

- Added a `handmade` client site scaffold template for makers and small craft showcases.
- Added a `jewelry` client site scaffold template for small jewelry collections.
- Added a `furniture` client site scaffold template for furniture and object design showcases.

## v0.1.2 - 2026-07-04

### Added

- Added an `artwork` client site scaffold template for visual artists, sculptors and illustrators.
- Added scaffold template boundary documentation.
- Added a manual client setup guide for use cases without a matching scaffold template.

### Fixed

- Fixed the `writing` scaffold template to use the supported Atelier-Kit YAML config structure.

## v0.1.1 - 2026-07-04

### Added

- Added a client site scaffold command with a writing showcase template.
- Added a reusable client intake brief for first site setup.

### Fixed

- Removed the noninteractive `tabindex` accessibility warning from VisitorBrief.

### Added

- Added practical customization recipes.
- Added file-based collections for curated item pages.
- Added item meta presets to the item helper CLI.
- Added Content Doctor pre-publish warnings.
- Added configurable Visitor Brief contact actions.
- Added copyable Visitor Brief from Signal Cloud selections.
- Added nested item meta information for configurable item detail pages.
- Improved setup, configuration, customization and Vercel deployment documentation.
- Improved Signal Cloud accessibility and selected-state feedback.
- Item helper scripts for creating, listing and validating YAML item records.
- Initial SvelteKit showcase template.
- YAML-driven site configuration.
- YAML-driven catalog configuration.
- YAML-driven item/card content.
- Item cards and item detail pages.
- Configurable single-choice Signal Clouds.
- Browser-local Signal Cloud selections.
- Placeholder image for demo items.
- Vercel adapter.
- MIT license.
