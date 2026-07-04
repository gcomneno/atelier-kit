# Atelier-Kit product levels

Atelier-Kit is moving from a developer-assisted file-based kit toward clearer support for non-technical creators.

These three product levels describe how much technical work a user must do to create and maintain a showcase.

They are not separate products. They are maturity stages of the same kit.

## Level 1 — Developer-assisted

**Who it is for:** developers, technical assistants, or creators comfortable with files and commands.

**What the user does:**

- copy or scaffold a client site folder;
- edit YAML files directly;
- add images to `static/images/items/`;
- run validation commands;
- deploy manually.

**What Atelier-Kit provides today:**

- SvelteKit showcase template;
- YAML-driven config and content;
- item helper CLI;
- client site scaffolds for common use cases;
- Content Doctor pre-publish warnings;
- documentation, recipes and client intake brief.

**Typical commands:**

```bash
npm run site:scaffold -- ../client-site --template artwork
npm run item:new -- blue-bowl "Blue Bowl" -- --preset handmade
npm run content:validate
npm run content:doctor
npm run build
```

**Current status:** available now.

## Level 2 — Guided setup

**Who it is for:** developers or assistants setting up a client site, and advanced creators who can run one guided command but should not edit YAML by hand.

**What the user does:**

- answer plain-language questions;
- review generated files;
- replace images and any remaining placeholders;
- run preview, validation and deploy steps when ready.

**What Atelier-Kit should provide:**

- interactive setup wizard;
- scaffold or patch generated config and starter content;
- validation summary in plain language;
- clear next-step instructions.

**Typical commands:**

```bash
npm run site:wizard
npm run site:wizard -- --template jewelry
```

**Current status:** in progress — wizard available; studio covers most file-based editing; publish script available.

The wizard is the first Level 2 deliverable. It does not remove the need for `npm install`, preview or deploy, but it removes manual YAML editing for the first site setup.

## Level 3 — Real no-code

**Who it is for:** non-technical artists, makers, writers and small creative professionals.

**What the user should be able to do without YAML, Git or npm knowledge:**

- choose a use case;
- edit site identity and contact actions;
- add and edit items;
- upload or select images;
- create collections;
- preview the site;
- understand validation problems in plain language;
- publish or hand off the site through a guided flow.

**What Atelier-Kit would need to provide:**

- a visual local or hosted editing experience;
- plain-language validation and publish readiness;
- optional packaging that hides the terminal for common workflows.

**Current status:** studio prototype available for most content; photo upload and publish readiness included. Full terminal-free use remains future work.

Level 3 is a product direction actively being built. See [`no-code-roadmap.md`](no-code-roadmap.md) and [`service-package.md`](service-package.md).

## How the levels relate

```text
Level 1   file editing + commands
   ↓
Level 2   guided questions + generated files
   ↓
Level 3   visual editing + guided publish/handoff
```

Each level should preserve the same output:

- a small file-based showcase;
- readable YAML content;
- no CMS, database or visitor accounts by default.

## Choosing the right level

| Situation | Recommended level |
|---|---|
| You maintain Atelier-Kit itself or many client sites | Level 1 |
| You are setting up a client site quickly with technical help nearby | Level 2 |
| The client will maintain the site alone without technical support | Level 3 eventually; Level 2 plus handoff for now |

## What Atelier-Kit is not trying to become

At any product level, Atelier-Kit should not become:

- a heavy CMS;
- a hosted SaaS by default;
- a marketplace or shop;
- a comment system;
- a generic website builder for every business type.

See [`positioning.md`](positioning.md) and [`no-code-roadmap.md`](no-code-roadmap.md).
