# Local studio

The local studio is Atelier-Kit Level 3 authoring.

It provides a browser UI for editing file-based site content without opening YAML files manually.

## Command

```bash
npm run studio
npm run studio:launch
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

## Studio scope

The studio edits:

- site identity (`config/site.yaml`)
- contact actions (`config/contact.yaml`)
- about page (`config/about.yaml`)
- catalog labels and visible fields (`config/catalog.yaml`)
- items with photo upload (`content/items/*.yaml`, `static/images/items/`)
- collections (`content/collections/*.yaml`)
- Signal Cloud questions and answer labels (`config/signal-clouds.yaml`)
- publish readiness via Content Doctor (`/studio/readiness`)

The studio does **not** yet:

- deploy the site (use `npm run publish -- --deploy`);
- edit Svelte layout or theme code;
- support multi-user permissions or revision history.

## What the studio does

- loads current site content;
- saves changes back to YAML files and item images;
- runs structural validation after each save;
- shows plain-language save results;
- links to the public site preview in a separate tab.

### Studio routes

| Route | Purpose |
|---|---|
| `/studio` | Site identity and contact settings |
| `/studio/about` | About page |
| `/studio/catalog` | Catalog vocabulary and visible fields |
| `/studio/items` | List items |
| `/studio/items/[id]` | Edit one item and upload its photo |
| `/studio/collections` | List collections |
| `/studio/collections/[id]` | Edit one collection |
| `/studio/signal-clouds` | Visitor questions and answer labels |
| `/studio/readiness` | Content Doctor publish review |

## Item photos

Upload a JPG, PNG or WebP file from the item editor. The studio saves it under `static/images/items/` and updates the item `image_file` automatically using the item id.

Example result:

```text
static/images/items/anello-onda.jpg
```

```yaml
image_file: /images/items/anello-onda.jpg
```

## What the studio does not do

- deploy the site;
- initialize Git;
- replace `content:doctor`, `check` or `build` for final launch;
- expose write access in production.

## Before publishing

Open `/studio/readiness` or run:

```bash
npm run publish
npm run publish -- --deploy
```

See [`deploy-vercel.md`](deploy-vercel.md) and [`../product/service-package.md`](../product/service-package.md).

## Related docs

- [`../architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md)
- [`../architecture/adr-0003-publishing-and-service-model.md`](../architecture/adr-0003-publishing-and-service-model.md)
- [`../product/product-levels.md`](../product/product-levels.md)
- [`../product/no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`content-doctor.md`](content-doctor.md)
