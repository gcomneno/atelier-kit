# Changelog

All notable changes to Atelier-Kit will be documented in this file.

## Unreleased

### Added

- Added studio flow to create new items at `/studio/items/new`.

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
