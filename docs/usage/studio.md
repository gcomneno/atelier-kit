# Local studio

The local studio is Atelier-Kit Level 3 authoring in early prototype form.

It provides a browser UI for editing file-based site content without opening YAML files manually.

## Command

```bash
npm run studio
```

This starts the dev server on `127.0.0.1` with studio mode enabled and opens the authoring UI at:

```text
http://127.0.0.1:5173/studio
```

During normal development you can also open `/studio` with:

```bash
npm run dev
```

Studio write routes remain disabled outside development unless `ATELIER_STUDIO=1` is set.

## Current prototype scope

Issue #38 covers the first studio slice:

- site identity (`config/site.yaml`)
- contact actions (`config/contact.yaml`)

The studio currently does **not** edit:

- items;
- collections;
- Signal Clouds;
- images.

Those belong to later prototype issues.

## What the studio does

- loads current site and contact settings;
- saves changes back to YAML files;
- runs structural validation after each save;
- shows plain-language save results;
- links to the public site preview in a separate tab.

## What the studio does not do

- deploy the site;
- upload images;
- initialize Git;
- replace `content:doctor`, `check` or `build`;
- expose write access in production.

## After saving

Refresh the preview tab if the homepage does not reflect your changes immediately.

Then run:

```bash
npm run content:doctor
npm run check
npm run build
```

## Related docs

- [`../architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md)
- [`../product/product-levels.md`](../product/product-levels.md)
- [`../product/no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`content-doctor.md`](content-doctor.md)
