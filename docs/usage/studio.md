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
- site appearance — background and text colors (`config/site.yaml` → `appearance`)
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
| `/studio` | Site identity, appearance, contact settings |
| `/studio/about` | About page |
| `/studio/catalog` | Catalog vocabulary and visible fields |
| `/studio/items` | List items |
| `/studio/items/new` | Create a new item |
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

## Site appearance

From `/studio`, choose a color preset or set custom base, accent and text colors. Values are saved under `config/site.yaml`:

```yaml
site:
  name: "My Studio"
  appearance:
    preset: warm
```

Presets: `warm` (default), `neutral`, `dark`, or `custom` with explicit hex colors.

Optional **background image** upload (JPG/PNG/WebP) saved to `static/images/site/background.*`.

## Operator language

Studio labels, save messages, Content Doctor output and `npm run publish` banners follow `site.language` in `config/site.yaml`. Supported operator locales: **English** (`en`) and **Italian** (`it`). See [ADR 0005](../architecture/adr-0005-operator-ui-i18n.md).

## Recommended access

The studio is **local authoring only**. Follow these rules:

1. Start with `npm run studio:launch` from the client site folder (not from Atelier-Kit itself).
2. Bind to localhost only — do not expose the dev server on your network.
3. `/studio` write routes are disabled in production builds. Never set `ATELIER_STUDIO=1` on Vercel or other hosted environments.
4. Preview visitor pages at `http://127.0.0.1:5173/` in a separate tab after saving.
5. Publish with `npm run publish -- --deploy` when ready.
6. Keep Git backups before large edits. Item photos live in `static/images/items/`.

The studio home and readiness pages repeat this guidance in the UI.

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

**Publish live** on the readiness page runs publish prep, commits `config/`, `content/` and `static/images/`, pushes to Git and deploys with Vercel CLI. Requires Git `origin`, credentials and a linked Vercel project on the operator machine.

See [`deploy-vercel.md`](deploy-vercel.md) and [`../product/service-package.md`](../product/service-package.md).

## Related docs

- [`../architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md)
- [`../architecture/adr-0003-publishing-and-service-model.md`](../architecture/adr-0003-publishing-and-service-model.md)
- [`../product/product-levels.md`](../product/product-levels.md)
- [`../product/no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`content-doctor.md`](content-doctor.md)
