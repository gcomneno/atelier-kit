# Micro-CMS contract — epic and issues

This file tracks the committed micro-CMS roadmap from [`micro-cms-positioning.md`](micro-cms-positioning.md).

## GitHub tracking

| Item | Issue | Status |
|---|---|---|
| **Epic — Tier 1** | [#72](https://github.com/gcomneno/atelier-kit/issues/72) | Closed — v0.1.20 |
| 1. Production-safe Studio | [#67](https://github.com/gcomneno/atelier-kit/issues/67) | Closed — Path B, [ADR 0007](../architecture/adr-0007-production-safe-studio-desktop.md) |
| 2. Terminal-free publish | [#68](https://github.com/gcomneno/atelier-kit/issues/68) | Closed |
| 3. XML sitemap | [#69](https://github.com/gcomneno/atelier-kit/issues/69) | Closed |
| 4. Client-side search | [#70](https://github.com/gcomneno/atelier-kit/issues/70) | Closed |
| 5. RSS feed | [#71](https://github.com/gcomneno/atelier-kit/issues/71) | Closed |
| **Tier 2 — JSON-LD** | [#73](https://github.com/gcomneno/atelier-kit/issues/73) | Closed |

Issues were enabled on `gcomneno/atelier-kit` on 2026-07-07. Tier 1 and Tier 2 completed 2026-07-08.

---

## Epic (Tier 1) — template

**Title:** Epic: Micro-CMS contract — Tier 1 (authoring, publish, discovery)

**Labels:** `enhancement`

**Body:**

```markdown
## Summary

Close the five gaps that block a credible micro-CMS claim for Atelier-Kit creative showcases.

Product doc: `docs/product/micro-cms-positioning.md`

## Goal

A non-technical client (with operator handoff or Desktop) can manage content in a browser, publish without Git/terminal knowledge, and visitors/search engines can discover all public content.

## Child issues

- [ ] #___ Production-safe Studio (browser-accessible authoring)
- [ ] #___ Terminal-free publish
- [ ] #___ XML sitemap
- [ ] #___ Client-side search (items + news)
- [ ] #___ RSS feed for news

## Out of scope for this epic

- Revision history UI
- Multi-user roles
- JSON-LD (Tier 2 — separate issue)
- Comments, ecommerce, plugins, page builders

## Success criteria

- Studio or Desktop provides production-safe content editing for the client use case
- Publish flow does not require terminal, Git or npm knowledge from the end client
- `/sitemap.xml` lists all public routes
- Site search finds items and news by title
- `/news/rss.xml` (or equivalent) syndicates news posts
```

---

## Issue 1 — Production-safe Studio

**Title:** Micro-CMS: production-safe Studio authoring

**Labels:** `enhancement`

**Body:**

```markdown
Part of epic: Micro-CMS contract — Tier 1

## Problem

Studio write routes are dev-only (`ATELIER_STUDIO=1` or local dev). In production, `/studio` returns 404. Buyers expect a micro-CMS to be editable from a browser.

## Proposed direction

Choose one primary path (document the decision in an ADR):

- **A.** Hosted studio with minimal auth (single-operator, no role system)
- **B.** Atelier Desktop as the default client authoring surface (Tauri)

Multi-user and revision UI are explicitly out of scope.

## Acceptance criteria

- [ ] Client can edit site identity, items, collections, news and about without YAML or a dev server
- [ ] Write surface is not exposed as an open public endpoint without protection
- [ ] Operator handoff docs updated (`operator-handoff-playbook.md`, `studio.md`)
- [ ] Security model documented (who can write, when, from where)

## References

- `docs/product/micro-cms-positioning.md` — pillar 2 (Authoring)
- `docs/architecture/adr-0002-local-studio-research.md`
```

---

## Issue 2 — Terminal-free publish

**Title:** Micro-CMS: terminal-free publish flow

**Labels:** `enhancement`

**Body:**

```markdown
Part of epic: Micro-CMS contract — Tier 1

## Problem

`npm run publish` requires terminal, validation scripts, Git and Vercel CLI. This is operator-grade, not client-grade micro-CMS behavior.

## Proposed direction

Extend Studio or Desktop with a guided publish action that runs validate → doctor → build → deploy without exposing Git/npm to the client.

Relates to existing epic [#52](https://github.com/gcomneno/atelier-kit/issues/52) where applicable.

## Acceptance criteria

- [ ] Client can trigger publish from Studio or Desktop with plain-language feedback
- [ ] Failures surface Content Doctor / validation messages in non-technical language
- [ ] Successful publish updates the live site (Vercel or documented export path)
- [ ] No Git commands required from the end client

## References

- `docs/product/micro-cms-positioning.md` — pillar 4 (Publishing)
- `docs/product/no-code-roadmap.md` — Phase 4 / epic #52
```

---

## Issue 3 — XML sitemap

**Title:** Micro-CMS: XML sitemap for public routes

**Labels:** `enhancement`, `good first issue`

**Body:**

```markdown
Part of epic: Micro-CMS contract — Tier 1

## Problem

No `sitemap.xml`. Search engines expect it; WordPress ships sitemap in core since 5.5.

## Scope

Generate a sitemap including at minimum:

- home `/`
- all published items `/items/<id>`
- collections `/collections`, `/collections/<id>`
- news index and posts `/news`, `/news/<slug>`
- about `/about`
- legal pages `/legal/<slug>`

Use `site.url` from `config/site.yaml` for absolute URLs.

## Acceptance criteria

- [ ] `GET /sitemap.xml` returns valid XML
- [ ] Only public, published content is listed
- [ ] Documented in usage docs
- [ ] Optional: reference in `robots.txt`

## References

- `docs/product/micro-cms-positioning.md` — pillar 6 (Discovery)
```

---

## Issue 4 — Client-side search

**Title:** Micro-CMS: client-side search for items and news

**Labels:** `enhancement`

**Body:**

```markdown
Part of epic: Micro-CMS contract — Tier 1

## Problem

No on-site search. Expected for catalogs with more than ~20 items. Already noted in ADR 0006 / roadmap phase 2.

## Scope

- Search UI in visitor chrome (header or catalog)
- Client-side filter on **item titles** and **news titles** (and optionally excerpts)
- No backend, no database
- i18n for en/it operator and visitor labels

## Out of scope

- Full-text search in YAML bodies
- SearchAction JSON-LD

## Acceptance criteria

- [ ] Visitor can find items and news by typing a query
- [ ] Works on static build (no server runtime required beyond SvelteKit load)
- [ ] Accessible keyboard navigation
- [ ] Documented in usage or recipes

## References

- `docs/product/micro-cms-positioning.md` — pillar 6 (Discovery)
- ADR 0006 (scope boundaries, search phase 2)
```

---

## Issue 5 — RSS feed for news

**Title:** Micro-CMS: RSS feed for news posts

**Labels:** `enhancement`, `good first issue`

**Body:**

```markdown
Part of epic: Micro-CMS contract — Tier 1

## Problem

News exists but there is no RSS/Atom feed. Writing-oriented showcases and feed readers expect it.

## Scope

- Feed route e.g. `/news/rss.xml` or `/feed.xml`
- Entries from `content/news/*.yaml`: title, date, excerpt, link, optional image
- `site.name` and `site.url` in feed metadata

## Acceptance criteria

- [ ] Valid RSS 2.0 or Atom feed
- [ ] Feed validates in a standard reader (manual check)
- [ ] Linked from news index page (`<link rel="alternate" type="application/rss+xml">`)
- [ ] Documented in usage docs

## References

- `docs/product/micro-cms-positioning.md` — pillar 6 (Discovery)
```

---

## Tier 2 — JSON-LD

**Title:** Micro-CMS Tier 2: JSON-LD on news and about

**Labels:** `enhancement`

**Body:**

```markdown
Tier 2 follow-up after epic: Micro-CMS contract — Tier 1

## Problem

Title, description and Open Graph exist. Structured data (`application/ld+json`) does not. Useful for article and identity pages; low impact on item catalog pages.

## Scope (minimal)

- **News detail:** `BlogPosting` — headline, datePublished, description/excerpt, image, publisher (`Organization` from `site.name`)
- **About:** `AboutPage` with `mainEntity` as `Person` or `Organization` from about content

## Out of scope

- `Product` schema on items (no checkout; risks Google confusion)
- Full `CreativeWork` on every item (optional later)
- `WebSite` + `SearchAction` (no search JSON-LD until search exists)

## Acceptance criteria

- [ ] `<script type="application/ld+json">` on news detail and about routes
- [ ] Validates in Google Rich Results Test (manual check)
- [ ] Reuses existing loaders (`showcase.js`) — no duplicate content source
- [ ] Documented briefly in configuration or SEO usage notes

## References

- `docs/product/micro-cms-positioning.md` — Tier 2, pillar 7 (SEO)
```

---

## Create on GitHub

Issues are live. To recreate or update, use the bodies in the sections below.

```bash
# Issues already created — see tracking table at top of this file
```
