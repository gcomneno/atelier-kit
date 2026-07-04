# No-code roadmap

This document defines Atelier-Kit’s staged path toward real no-code authoring.

It supports epic [#35](https://github.com/gcomneno/atelier-kit/issues/35).

## Goal

Move from a developer-assisted file-based kit to a guided and eventually visual authoring experience without losing Atelier-Kit’s core principles:

- simple static/output-friendly sites;
- privacy-friendly behavior;
- no visitor accounts by default;
- no ecommerce by default;
- no analytics by default;
- no comments system;
- no backend contact form by default;
- readable and exportable content;
- separation between framework and client site.

## Product levels

See [`product-levels.md`](product-levels.md) for the three levels:

1. Developer-assisted
2. Guided setup
3. Real no-code

## Staged approach

### Phase 1 — Better developer-assisted setup

Improve the current file-based workflow so client sites can be prepared reliably before any visual editor exists.

Deliverables:

- [x] client scaffold templates for common use cases
- [x] manual client setup guide
- [x] scaffold template boundary documentation
- [x] friendlier Content Doctor messages for non-technical users
- [ ] clearer generated placeholders where still needed
- [x] client-ready checklist in manual setup docs

**Status:** complete enough for current client-site work.

### Phase 2 — Guided CLI setup

Add an interactive wizard that asks plain-language questions and generates starter site content.

Command:

```bash
npm run site:wizard
npm run site:wizard -- --template artwork
```

The wizard should collect:

- site title;
- tagline;
- language;
- contact email;
- optional WhatsApp;
- use case / template;
- first item title;
- publish readiness notes through validation output.

Expected output:

- generated or patched YAML;
- starter item and collection content;
- validation summary;
- next-step instructions.

**Status:** available in `site:wizard`.

### Phase 3 — Local Studio prototype

Explore a local visual editing interface that writes the same file-based content.

Possible command:

```bash
npm run studio
```

The studio should eventually allow editing:

- `config/site.yaml`
- `config/catalog.yaml`
- `config/contact.yaml`
- `config/signal-clouds.yaml`
- `content/items/*.yaml`
- `content/collections/*.yaml`

It should validate content before saving and avoid requiring a database at first.

Architecture research: [`docs/architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md).

**Status:** available via `npm run studio` — site, about, catalog, contact, items (with photo upload), collections, signal clouds and publish readiness.

### Phase 4 — True no-code packaging

Explore whether Atelier-Kit can become usable without the terminal for non-technical users.

Decision: primary path is **kit + service + guided deploy**. See ADR 0003.

Possible directions:

- desktop wrapper;
- hosted starter;
- GitHub template plus deploy button;
- guided Vercel deployment;
- generated ZIP export.

Deliverables:

- [x] ADR 0003 publishing and service model
- [x] service package documentation
- [x] `npm run publish` script
- [ ] desktop wrapper research
- [ ] deploy button template for client repos

**Status:** guided publish available; full terminal-free packaging remains research.

## Architecture options

| Option | Description | Fit for Atelier-Kit |
|---|---|---|
| A. CLI wizard | guided terminal flow generating files | best first step; keeps current architecture |
| B. Local studio | browser UI writing local files | strong candidate for Level 3 without accounts |
| C. Hosted studio | web app with storage and deploy integration | possible later, but high product cost |
| D. External CMS | headless CMS integration | weak fit; conflicts with CMS-free positioning |

**Recommended direction:** A now, B next, research C and D before committing.

## Success criteria

### First milestone — guided setup

> A non-developer can create a complete creative showcase from a guided flow with no manual YAML editing.

This still allows technical steps such as `npm install`, preview and deploy, ideally with assistant help.

### Later milestone — visual no-code

> A non-technical user can create, edit, preview and export or publish an Atelier-Kit site entirely through a visual interface.

## Non-goals

This roadmap does not require, in the near term:

- building a hosted SaaS;
- adding ecommerce;
- adding user accounts;
- adding comments;
- adding analytics;
- adding a generic CMS;
- replacing the file-based model;
- supporting every possible creative business;
- solving deployment for every provider.

## Risks

- A no-code editor can turn Atelier-Kit into the CMS it was designed to avoid.
- Hosted editing introduces accounts, storage, permissions and maintenance burden.
- Too much automation may hide the clean file-based model.
- A visual editor may become more complex than the showcase itself.
- Supporting many templates may increase maintenance cost.

## Design constraint

Do not sacrifice the simple static/client-site output.

Even if a no-code authoring layer is added, the generated site should remain small, inspectable and portable.

## Related docs

- [`product-levels.md`](product-levels.md)
- [`positioning.md`](positioning.md)
- [`../usage/client-scaffold.md`](../usage/client-scaffold.md)
- [`../usage/manual-client-setup.md`](../usage/manual-client-setup.md)
- [`../client-intake.md`](../client-intake.md)
- [`../architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md)
