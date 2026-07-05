# Atelier-Kit service package

This document defines the default commercial delivery model for real clients.

It supports ADR 0003 and epic [#43](https://github.com/gcomneno/atelier-kit/issues/43).

## Positioning

> A small online showcase for unique creative work — not a shop, not a CMS, not a comment system.

The service sells **clarity and handoff**, not hosting lock-in.

## Standard package — “Vetrina pronta”

### Included

- intake call using [`client-intake.md`](../client-intake.md);
- client site scaffold or `site:wizard`;
- site identity, about page, contact actions;
- up to 10 items with photos;
- one collection;
- Signal Cloud questions localized for the client;
- Content Doctor review;
- Vercel deploy or export ready for deploy;
- 30-minute handoff: studio, preview, update workflow.

### Operator workflow

See the full step-by-step checklist in [`operator-handoff-playbook.md`](operator-handoff-playbook.md).

### Client handoff

The client receives:

- public URL;
- [`operator-handoff-playbook.md`](operator-handoff-playbook.md) client checklist section;
- short note on editing through studio;
- reminder that photos upload in studio;
- contact actions via Visitor Brief (no backend form).

### Typical timing

| Phase | Duration |
|---|---|
| Intake + scaffold | 30–60 min |
| Content + photos | 1–3 h |
| Review + deploy | 30–45 min |
| Handoff | 30 min |

First launch: **half day to one day** with operator support.

### Suggested pricing (operator-defined)

| Package | Indicative range |
|---|---|
| Setup only | €300–500 |
| Setup + first content batch | €500–800 |
| Later content updates | €50–150 / session |

Infrastructure for a small showcase is usually **€0–20/month**.

## What stays out of scope

Unless explicitly contracted:

- ecommerce;
- booking systems;
- newsletter;
- blog;
- multi-language CMS workflows;
- custom design outside Atelier-Kit templates;
- ongoing hosting administration beyond first deploy.

## Success criteria

The package succeeds when:

- the client can update texts and item details alone through studio;
- the client understands how to replace photos;
- the public site loads quickly and passes `npm run publish`;
- the contact flow uses Visitor Brief instead of a backend form.

## Related docs

- [`operator-handoff-playbook.md`](operator-handoff-playbook.md)
- [`product-levels.md`](product-levels.md)
- [`positioning.md`](positioning.md)
- [`studio.md`](../usage/studio.md)
- [`deploy-vercel.md`](../usage/deploy-vercel.md)
