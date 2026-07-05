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

These ranges are **defaults for a full-service handoff**. Individual operators may charge less when the client already supplies content, photos and copy.

| Package | Indicative range | When it fits |
|---|---|---|
| **Kit setup light** | **€50** (typical) | Client provides texts, photos and materials; operator scaffolds, configures Atelier-Kit, runs `publish`, first deploy and a short handoff. Very low labour — studio + scripts do the work. |
| Setup only | €300–500 | Operator also shapes identity, structure and first editorial pass |
| Setup + first content batch | €500–800 | Operator writes/edits most copy and prepares photos |
| Later content updates | €50–150 / session | Ad-hoc studio sessions or deploy help |

**Infrastructure is always paid by the client** (Vercel account, domain, any Pro plan). The operator quote covers labour only unless explicitly agreed otherwise.

Infrastructure for a small showcase is usually **€0–20/month** on the client side.

### Operator compensation (optional practice)

Some operators collect small setup fees (**e.g. €50**) as a **donation via [GitHub Sponsors](https://github.com/sponsors)** rather than invoiced professional services — especially when the amount is symbolic and the relationship is informal.

If you use this model:

- state clearly to the client that the payment is a **voluntary donation / sponsor support**, not a VAT invoice for a commercial package;
- keep scope minimal and documented (what you do vs what the client provides);
- **verify local tax rules yourself** (Italy: donazioni occasionali, prestazioni occasionali, partita IVA, etc.) — this doc is not legal or tax advice.

The Atelier-Kit project (MIT) never takes a cut of operator fees or donations.

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
