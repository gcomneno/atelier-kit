# Atelier-Kit

Atelier-Kit is a lightweight configurable showcase kit for makers, artists, artisans and small creative activities.

It is designed for people who want a clean online catalog for handmade items without starting a full e-commerce project.

## Core idea

Configure the site, add items and images, deploy the showcase.

No cart. No checkout. No accounts. No public comments. No contact-form swamp.

## Features

- SvelteKit application.
- Vercel-ready deployment.
- YAML-driven site identity.
- YAML-driven catalog settings.
- YAML-driven item/card content.
- File-based item/card CRUD.
- Nested item meta information.
- Static images.
- Configurable Signal Clouds.
- Single-choice Signal Cloud answers.
- Browser-local Signal Cloud selections.
- Placeholder image for quick setup.
- Content validation script.
- GitHub Actions validation workflow.

## Quick start

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Create a first item:

```bash
npm run item:new -- my-first-item "My First Item"
```

Validate content and build:

```bash
npm run item:validate
npm run check
npm run build
```

Preview the site locally:

```bash
npm run preview
```

## First customization path

For a first real setup, edit files in this order:

1. `config/site.yaml` for site name, tagline and footer text.
2. `config/catalog.yaml` for catalog field visibility and item vocabulary.
3. `config/signal-clouds.yaml` for lightweight visitor preference questions.
4. `content/items/` for item records.
5. `static/images/items/` for item images.

The fastest useful path is:

```bash
npm run item:new -- ceramic-bowl "Ceramic Bowl"
npm run item:list
npm run item:validate
npm run dev
```

Then edit:

```text
content/items/ceramic-bowl.yaml
```

## Item/Card CRUD

Atelier-Kit 1.0 uses file-based CRUD.

Helper commands:

```bash
npm run item:new -- my-first-item "My First Item"
npm run item:list
npm run item:validate
```

- Create: run `npm run item:new -- <id> "<Title>"`, then edit the generated YAML file.
- Read: the homepage and `/items/<id>` pages are generated automatically.
- Update: edit the YAML file or replace the image.
- Delete: remove the YAML file and optionally remove the image.
- Validate: run `npm run item:validate`.

This keeps the template simple and avoids database, login and admin-dashboard complexity.

## Nested meta information

Item detail pages can render configurable meta information from each item YAML file.

Example:

```yaml
meta:
  - label: "Material"
    value: "Ceramic"

  - label: "Object details"
    children:
      - label: "Finish"
        value: "Matte glaze"
      - label: "Care"
        value: "Dust gently"
```

Meta entries support:

- `label`;
- optional `value`;
- optional `children`.

Use nested children for simple submeta structures. Keep nesting shallow unless there is a clear reason.

## Signal Clouds

Signal Clouds are configurable word-cloud-style questions shown on item pages.

They let visitors express a lightweight preference or perception without accounts, comments, names or email addresses.

Rules:

- one cloud represents one question;
- each cloud is always single-choice;
- visitors may change their answer;
- changing an answer replaces the previous local selection;
- multiple-choice clouds are intentionally out of scope;
- no public counters are shown;
- no personal data is collected.

## Project structure

- `config/site.yaml` configures the site identity.
- `config/catalog.yaml` configures catalog vocabulary and visible fields.
- `config/signal-clouds.yaml` configures Signal Cloud questions and answers.
- `content/items/` contains item records.
- `static/images/items/` contains item images.
- `docs/` contains product, architecture and usage notes.
- `src/` contains the SvelteKit application.

## Development

Run all checks before pushing:

```bash
npm run item:validate
npm run check
npm run build
```

The repository also includes a GitHub Actions workflow that runs validation on pushes and pull requests.

## Deploy

Atelier-Kit uses the Vercel adapter.

Deploy with:

```bash
npx vercel
```

Production deploy:

```bash
npx vercel --prod
```

See `docs/usage/deploy-vercel.md` for the pre-deploy checklist.

## Documentation

- `docs/usage/configuration.md` explains the YAML configuration files.
- `docs/usage/customization.md` explains the first customization workflow.
- `docs/usage/deploy-vercel.md` explains Vercel deployment.
- `docs/product/positioning.md` explains the product direction.
- `docs/architecture/adr-0001-configurable-showcase-kit.md` explains the main architecture decision.

## Support

Atelier-Kit is open-source under the MIT license.

People who can configure it themselves can use it freely.

People who want help configuring, customizing or deploying it may support the author or request paid setup/customization work.

## Status

Atelier-Kit is in early development.

The first goal is to build a clean configurable showcase template before adding any advanced storage, dashboard or server-side analytics.
