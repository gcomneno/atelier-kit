# Atelier-Kit service package

This document defines the default commercial delivery model for real clients.

It supports ADR 0003 and epic [#43](https://github.com/gcomneno/atelier-kit/issues/43).

## Positioning

> A professional online showcase, configured, published and handed off so the client can maintain ordinary content without becoming a webmaster.

Atelier-Kit remains a bounded micro-CMS: not a shop, not a generic CMS, not a comment system.

The service sells **a ready-to-use result, guided setup and client independence**. It does not sell hosting lock-in or a proprietary software licence.

For the micro-CMS contract and WordPress comparison, see [`micro-cms-positioning.md`](micro-cms-positioning.md).

## Standard package — “Vetrina pronta” Base

**Commercial price: €290 one-time.**

The Base package is intended for artists, artisans, makers, authors and small creative activities that need a clean public showcase without ecommerce or a heavy CMS.

### Included

- intake call using [`client-intake.md`](../client-intake.md);
- client site scaffold or `site:wizard`;
- site identity, tagline and project description;
- About page;
- contact actions via email and/or WhatsApp;
- visual configuration using the options already available in Atelier-Kit;
- up to **10 initial items**, using photos and substantially final text supplied by the client;
- up to **one collection**;
- Signal Cloud questions localized for the client when useful;
- editorial public FAQ configuration when useful;
- Content Doctor and pre-publication review;
- first production deploy;
- post-deploy verification;
- initial configuration of the client authoring environment;
- **30-minute handoff** covering Studio / Atelier Desktop, preview and the normal update workflow;
- one final revision round for corrections to supplied text, content mistakes or small configuration details within the agreed scope.

### What the client provides

Before production work starts, the client should provide:

- public project or activity name;
- substantially final primary text;
- photos they are legally allowed to publish;
- information for the initial items;
- public email address and/or WhatsApp number;
- an existing logo, if one is to be used;
- reasonable cooperation or access needed to configure domain and infrastructure accounts.

The Base package assumes that supplied content is reasonably close to publication-ready. Small corrections and formatting are part of setup; full copywriting, large-scale image preparation and content reconstruction are not.

### Domain, Vercel and publication

The client **does not need to manage the technical publication setup alone**.

The Base package includes operator assistance for the initial publication flow, including as applicable:

- helping the client create the required infrastructure accounts;
- configuring the Vercel project;
- performing the first production deploy;
- helping with domain purchase/configuration when a custom domain is requested;
- configuring the DNS records required to connect that domain;
- verifying that the public site and custom domain work correctly.

Domain, hosting, Vercel paid plans and other third-party service charges are **not included in the €290 price**. Those costs are paid directly by the client.

Whenever possible, accounts and domains are created in the **client's own name and under the client's control**. The operator configures the infrastructure but does not create artificial hosting lock-in or retain ownership of the client's domain or accounts.

Where compatible with the project, free infrastructure tiers may be used.

### What the client can maintain after handoff

Using Atelier Desktop / Studio, the client can normally update:

- site title and primary text;
- available appearance settings;
- About content;
- catalog items;
- item photos;
- collections;
- news;
- Signal Clouds and editorial FAQ entries;
- publication through the guided readiness / publish flow.

Studio remains local to the client machine and is not exposed on the public production site.

### Operator workflow

See the full step-by-step checklist in [`operator-handoff-playbook.md`](operator-handoff-playbook.md).

### Client handoff

The client receives:

- a working public URL;
- the separate Atelier-Kit client project;
- their project content and photos;
- the configured authoring tools;
- the [`operator-handoff-playbook.md`](operator-handoff-playbook.md) client checklist section;
- a short editing and publication guide;
- the 30-minute handoff session.

### Typical internal timing

| Phase | Typical operator time |
|---|---|
| Intake + scaffold | 30–60 min |
| Content + photos | 1–3 h |
| Review + deploy | 30–45 min |
| Handoff | 30 min |

A first launch is normally planned internally as **half a day to one day** of operator work. This is an internal planning estimate, not a public delivery-time guarantee.

## Not included in the €290 Base package

Unless separately quoted, Base does not include:

- logo creation or complete visual identity work;
- professional photography;
- large-scale professional image processing;
- full copywriting;
- translation;
- fully custom visual design outside Atelier-Kit's supported configuration;
- development of new product features;
- ecommerce, cart or payment flows;
- booking systems;
- newsletter systems;
- user accounts;
- backend contact forms;
- migration of large content archives;
- continuous maintenance;
- future Atelier-Kit upgrades;
- ongoing hosting administration after the initial handoff.

Requests that materially change the agreed project scope are quoted separately.

## Later assistance

After handoff, the client is expected to manage ordinary content updates independently.

Optional later paid work may include:

- content update sessions;
- publication assistance;
- Atelier-Kit upgrades;
- structural changes;
- custom development or design work.

No recurring maintenance commitment is implied by the Base package.

## Success criteria

The Base package succeeds when:

- the public showcase is online and verified;
- the client's agreed initial content is present;
- `npm run publish` succeeds before handoff;
- the client can update ordinary text, items and photos through Studio / Atelier Desktop;
- the client understands the normal publication workflow;
- domain and infrastructure ownership remain with the client;
- the contact flow uses Visitor Brief instead of a backend form unless separately contracted.

## Commercial principle

Atelier-Kit itself remains open-source under the MIT licence.

The €290 price pays for the **service**: intake, setup, configuration, publication, verification and handoff. A technically capable person may use Atelier-Kit independently without buying this service.

The intended outcome is simple:

> A clean, fast showcase under the client's control, ready to use without requiring the client to become a webmaster.

## Related docs

- [`client-intake.md`](../client-intake.md)
- [`micro-cms-positioning.md`](micro-cms-positioning.md)
- [`operator-handoff-playbook.md`](operator-handoff-playbook.md)
- [`product-levels.md`](product-levels.md)
- [`positioning.md`](positioning.md)
- [`studio.md`](../usage/studio.md)
- [`deploy-vercel.md`](../usage/deploy-vercel.md)
