# Atelier-Kit as a micro-CMS

This document defines how Atelier-Kit should be positioned relative to full CMS products such as WordPress.

It does not claim parity with WordPress. It defines a **studied subset** of CMS capabilities that matter for creative showcases — and states clearly what Atelier-Kit includes, what it deliberately excludes, and where the product is still incomplete.

See also:

- [`positioning.md`](positioning.md) — audience and core promise
- [`product-levels.md`](product-levels.md) — maturity stages toward no-code authoring
- [`no-code-roadmap.md`](no-code-roadmap.md) — delivery plan for remaining CMS gaps

## Positioning statement

> **Atelier-Kit is a micro-CMS for creative showcases.**  
> It takes from modern CMS products only what creators need: structured content, visual editing, media, publishing, basic SEO and portable files.  
> It cuts everything else: database, plugin ecosystem, comments, shop, visitor accounts, page builders and analytics.

WordPress is a **reference architecture**, not a feature checklist. The goal is not “WordPress but smaller”. The goal is a **minimum credible CMS contract** for one use case: presenting handmade work online.

## Micro-CMS vs generic CMS

These are different products. Atelier-Kit should avoid becoming a generic CMS.

| Generic CMS (not the goal) | Micro-CMS (the goal) |
|---|---|
| Database-backed, extensible for every site type | File-based, fixed content types, one primary use case |
| Plugin marketplace and open-ended customization | Curated features, upgrade via kit sync |
| Hosted admin with multi-user roles by default | Local or lightweight authoring, single-operator first |
| Page builder, widgets, unlimited pages | Layout presets and fixed routes |
| Comments, accounts, ecommerce, analytics | Excluded by design |

A no-code editor must not turn Atelier-Kit into the CMS it was designed to avoid. A **bounded** editor for a **bounded** content model is the micro-CMS path.

## The micro-CMS contract

A credible micro-CMS inspired by WordPress should cover eight pillars. Each pillar lists what full CMS users expect, what the micro-CMS minimum is, and how Atelier-Kit maps today.

### 1. Content model

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Posts, pages, custom types | Fixed types with rich fields | **Items**, **collections**, **news**, **about**, **legal** |
| Custom fields | Structured meta on content | Nested item meta, presets (`jewelry`, `artwork`, …) |
| Taxonomies | Optional | Collections (curated groups, not open tags) |
| Content relationships | Useful | Collection → item references |

**Status:** solid for the target use case.

### 2. Authoring

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Admin UI for CRUD | Visual editing without YAML | **Studio** (`npm run studio`) |
| Preview before publish | Yes | Dev server / preview |
| Pre-save validation | Yes | Content validate + Content Doctor |
| Browser-accessible admin | Yes for a finished micro-CMS | **Atelier Desktop** → localhost `/studio` (ADR 0007). Production URL is read-only; `/studio` returns 404 on Vercel |
| No terminal required | Yes at Level 3 | **Atelier Desktop** for clients; `studio:launch` for operators ([#67](https://github.com/gcomneno/atelier-kit/issues/67)) |
| Revision history | Nice to have | Git only; no restore UI — **out of scope** (Git is enough) |

**Status:** **client-grade via Atelier Desktop** (Path B, ADR 0007). Hosted production studio (Path A) deferred.

### 3. Media

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Image upload | Yes | Studio upload → `static/images/` |
| Alt text | Yes | On items and news |
| Central media library | Nice to have | Files on disk, no DAM |
| Galleries, auto-resize | Optional | Single primary image per item |

**Status:** sufficient for showcases.

### 4. Publishing

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Draft / published states | Yes | Item `status` |
| One-step publish | Yes | **`/studio/readiness` → Put site online** — validate, doctor, build, deploy in one action; Git/npm hidden from client |
| Scheduled publish | Optional | Not implemented |
| Publish readiness feedback | Useful | Content Doctor + plain-language publish results in studio |

**Status:** **client-grade via Studio / Atelier Desktop** when Git and Vercel are configured at handoff ([#68](https://github.com/gcomneno/atelier-kit/issues/68)).

### 5. Site structure

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Stable URLs | Yes | SvelteKit routes (`/items/<id>`, `/news/<slug>`, …) |
| Navigation | Yes | Config-driven nav and layout blocks |
| Configurable home layout | Limited | Layout presets (`single-column`, `catalog-sidebar`) and block placement |
| Unlimited custom pages | Not required | Fixed page types only |

**Status:** adequate for creative showcases; not for large corporate sites.

### 6. Discovery

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| XML sitemap | Yes | **`/sitemap.xml`** — all public routes ([#69](https://github.com/gcomneno/atelier-kit/issues/69)) |
| RSS for editorial content | Yes when blog/news exists | **`/news/rss.xml`** ([#71](https://github.com/gcomneno/atelier-kit/issues/71)) |
| On-site search | Yes for larger catalogs | **Client-side search** on item and news titles ([#70](https://github.com/gcomneno/atelier-kit/issues/70)) |
| `robots.txt` | Useful | **`/robots.txt`** with `Sitemap:` when served |

**Status:** complete for the micro-CMS contract.

### 7. Identity and SEO

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Per-page title and description | Yes | Implemented |
| Open Graph and social preview | Yes | Implemented |
| Document language | Yes | `<html lang>` from `site.language` |
| Structured data (JSON-LD) | Useful | **`BlogPosting`** (news), **`Person`/`Organization`** (about) ([#73](https://github.com/gcomneno/atelier-kit/issues/73)) |
| Multi-locale sites | Not required for micro | UI labels en/it; content is manual; hreflang out of scope |

**Status:** complete for the micro-CMS contract.

### 8. Portability

| Full CMS expectation | Micro-CMS minimum | Atelier-Kit today |
|---|---|---|
| Inspectable content | Yes | YAML in `config/` and `content/` |
| No vendor lock-in | Yes | Files + Git |
| Framework upgrade without losing content | Yes | `site:upgrade` |
| Guided import | Nice to have | Scaffold and `site:wizard` |

**Status:** **strong differentiator** versus typical WordPress hosting lock-in.

## Scorecard

| Pillar | Status | Notes |
|---|---|---|
| 1. Content model | Complete | — |
| 2. Authoring | Complete | Atelier Desktop, ADR 0007 |
| 3. Media | Complete | — |
| 4. Publishing | Complete | Put site online; Git/Vercel at operator handoff |
| 5. Site structure | Complete | — |
| 6. Discovery | Complete | Sitemap, RSS, search, robots.txt |
| 7. SEO base | Complete | Meta, OG, JSON-LD |
| 8. Portability | Complete | — |

Rough maturity against the micro-CMS contract: **~90%**. Tier 1 ([#72](https://github.com/gcomneno/atelier-kit/issues/72)) and Tier 2 ([#73](https://github.com/gcomneno/atelier-kit/issues/73)) are shipped. Remaining gaps are explicit non-goals (multi-user, revision UI, hosted Path A studio, scheduled publish).

## In the studied subset

These capabilities belong in the micro-CMS promise:

- fixed but rich content types (items, collections, news, about, legal);
- Studio for visual editing of config and content;
- media upload with alt text;
- validation and publish-readiness tooling;
- per-page SEO metadata, social previews, sitemap, RSS, search and JSON-LD (news/about);
- portable YAML content and kit upgrade path;
- configurable appearance and home layout without a page builder;
- Signal Clouds and Visitor Brief as a privacy-friendly contact pattern.

## Outside the studied subset

Excluding these does **not** weaken the micro-CMS claim. WordPress often reaches them through plugins or heavy configuration:

- plugin ecosystem and third-party extensions;
- ecommerce, cart and checkout;
- public comments and community features;
- visitor accounts, membership and login;
- multisite and multi-tenant SaaS;
- drag-and-drop page builders;
- built-in analytics and tracking;
- automatic multi-locale content translation;
- headless REST/GraphQL API for external apps.

## Gaps that affect credibility

If Atelier-Kit is presented as a micro-CMS, buyers will expect **CMS behavior**, not “a YAML template with scripts”.

| Expectation | Current state | Impact on claim |
|---|---|---|
| “I manage content in a browser” | **Atelier Desktop** → localhost `/studio` (ADR 0007) | Low — after Desktop handoff |
| “I publish without knowing Git” | **Put site online** in `/studio/readiness` (Git in background) | Low — after operator configures deploy |
| “Search engines can index everything” | `/sitemap.xml` + `/robots.txt` | Addressed |
| “I can search the catalog” | Client-side search in visitor header | Addressed |
| “My blog has a feed” | `/news/rss.xml` | Addressed |
| “Two people edit the site” | No multi-user permissions | Low — **out of scope** for current target |
| “I edit from any browser on the live URL” | Production `/studio` returns 404; Path A deferred | Medium — use Desktop or operator |

The micro-CMS claim is **defensible today** for operator-assisted or Desktop handoff. See [`product-levels.md`](product-levels.md) Level 3.

## Recommended messaging

**Short pitch:**

> Atelier-Kit is a micro-CMS for creative showcases. It gives you structured content, visual editing, media, publishing and SEO basics — without database, plugins, comments or a shop.

**Honest qualifier:**

> Atelier-Kit is a micro-CMS via **Atelier Desktop** and guided publish — not via wp-admin on shared hosting. The operator configures Git and Vercel once at handoff; the client edits locally and clicks **Put site online**.

**Do not say:**

- “Like WordPress but simpler” — invites wrong comparisons.
- “A full CMS” — contradicts the studied subset.
- “No CMS at all” — undersells Studio and the content model.

## Official roadmap (approved)

This section records product decisions from the micro-CMS positioning review. It supersedes the informal priority list below for committed work.

### Tier 1 — complete (epic [#72](https://github.com/gcomneno/atelier-kit/issues/72))

These five deliverables close the micro-CMS contract. Shipped in v0.1.20.

| # | Deliverable | Pillar | Notes |
|---|---|---|---|
| 1 | **Production-safe Studio** — browser-accessible authoring outside dev-only | Authoring | **Atelier Desktop** (Path B, ADR 0007). Hosted auth (Path A) deferred |
| 2 | **Terminal-free publish** | Publishing | **`/studio/readiness` → Put site online** ([#68](https://github.com/gcomneno/atelier-kit/issues/68)) |
| 3 | **XML sitemap** | Discovery | All public routes (items, collections, news, about, legal) |
| 4 | **Client-side search** | Discovery | Item and news titles; aligns with ADR 0006 phase 2 |
| 5 | **RSS feed for news** | Discovery | Important for writing-oriented showcases |

Details in [`micro-cms-epic.md`](micro-cms-epic.md).

### Tier 2 — complete

| Deliverable | Pillar | Scope |
|---|---|---|
| **JSON-LD structured data** | SEO | `BlogPosting` on news detail, `Person` or `Organization` on about — not full schema on every item |

Shipped in v0.1.20 ([#73](https://github.com/gcomneno/atelier-kit/issues/73)). Item pages stay without schema; do **not** use `Product` without checkout semantics.

### Explicitly out of scope

These will **not** be added to close the micro-CMS gap:

- revision history with restore UI (Git is the source of truth);
- multi-user roles and permissions;
- comments, ecommerce, plugin ecosystem, page builders, analytics (unchanged).

## Roadmap priorities (reference)

Historical ordering before Tier 1 was approved. Use the **Official roadmap** section above for committed work.

1. **XML sitemap** — small implementation, immediate SEO credibility.
2. **Client-side search** on item and news titles — already planned; standard CMS expectation.
3. **RSS for news** — important for writing-oriented showcases.
4. **Production-safe authoring path** — hosted studio with minimal auth, or Desktop as the primary client surface.
5. **Terminal-free publish** — epic [#52](https://github.com/gcomneno/atelier-kit/issues/52).
6. **JSON-LD** — Tier 2; news and about only.

Do not add comments, ecommerce, plugin architecture or generic page builders to “catch up” with WordPress. That would break the micro-CMS definition.

## When to choose Atelier-Kit vs WordPress

| Situation | Better fit |
|---|---|
| Creative catalog, about page, occasional news | Atelier-Kit |
| Client wants zero server maintenance | Atelier-Kit |
| Content must stay readable and portable | Atelier-Kit |
| Many custom pages, complex menus, forms | WordPress (+ plugins) |
| Shop, comments, memberships, multi-editor newsroom | WordPress (+ plugins) |
| Client expects familiar wp-admin on shared hosting | WordPress |

## Relation to other positioning docs

[`positioning.md`](positioning.md) states that Atelier-Kit is not WordPress. This document refines that line:

- Atelier-Kit is **not a WordPress replacement**.
- Atelier-Kit **is** a micro-CMS that inherits a **curated subset** of what WordPress normalized for the market.

[`service-package.md`](service-package.md) describes commercial delivery. The micro-CMS framing supports the service model: operators deliver a **complete small CMS** for one job, not a generic platform.

[`no-code-roadmap.md`](no-code-roadmap.md) non-goals (no generic CMS, no SaaS by default) remain valid. The micro-CMS path is **bounded authoring for bounded content**, not expansion into a general-purpose CMS.
