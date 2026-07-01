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
- Static images.
- Configurable Signal Clouds.
- Single-choice Signal Cloud answers.
- Browser-local Signal Cloud selections.
- Placeholder image for quick setup.
- Content validation script.

## Item/Card CRUD

Atelier-Kit 1.0 uses file-based CRUD.

- Create: add a YAML file in `content/items/` and an image in `static/images/items/`.
- Read: the homepage and `/items/<id>` pages are generated automatically.
- Update: edit the YAML file or replace the image.
- Delete: remove the YAML file and optionally remove the image.

This keeps the template simple and avoids database, login and admin-dashboard complexity.

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

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Check the project:

```bash
npm run check
npm run content:validate
npm run build
```

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

## Support

Atelier-Kit is open-source under the MIT license.

People who can configure it themselves can use it freely.

People who want help configuring, customizing or deploying it may support the author or request paid setup/customization work.

## Status

Atelier-Kit is in early development.

The first goal is to build a clean configurable showcase template before adding any advanced storage, dashboard or server-side analytics.
