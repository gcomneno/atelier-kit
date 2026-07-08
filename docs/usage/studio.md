# Local studio

The local studio is Atelier-Kit Level 3 authoring.

It provides a browser UI for editing file-based site content without opening YAML files manually.

## Recommended access — Atelier Desktop (clients)

For non-technical clients, **Atelier Desktop** is the primary authoring path (ADR 0007). The live site stays read-only; editing happens on the client machine only.

1. Operator scaffolds the site and runs `npm install` once.
2. Client installs **Atelier Desktop** (see [`desktop/README.md`](../../desktop/README.md)).
3. Client chooses the site folder → **Open studio** — localhost starts with `ATELIER_STUDIO=1` and opens `/studio` in a webview.
4. Client edits in the browser UI; saves write YAML and images to disk.
5. Publish via `/studio/readiness` or operator-assisted deploy.

Operators can use `npm run studio:launch` instead of Desktop.

## Command (operators)

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

## Security model

| | |
|---|---|
| **Who can write** | Operator or client with the site folder and an active local studio session |
| **When** | Local dev server running with `ATELIER_STUDIO=1` on `127.0.0.1` |
| **Where** | Localhost only — `config/`, `content/`, approved `static/images/` |
| **Production** | `/studio` returns **404**. Never set `ATELIER_STUDIO=1` on Vercel or other hosted environments |

Implementation: `src/lib/server/studio-guard.js`. Full decision record: [ADR 0007](../architecture/adr-0007-production-safe-studio-desktop.md).

Hosted studio with production auth (Path A) is **out of scope** for the current micro-CMS contract; see ADR 0007 for rationale.

## Studio scope

The studio edits:

- site identity (`config/site.yaml`)
- site appearance — background and text colors (`config/site.yaml` → `appearance`)
- contact actions (`config/contact.yaml`)
- about page (`config/about.yaml`)
- catalog labels and visible fields (`config/catalog.yaml`)
- items with photo upload (`content/items/*.yaml`, `static/images/items/`)
- collections (`content/collections/*.yaml`)
- news posts (`content/news/*.yaml`)
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
| `/studio/news` | List news posts |
| `/studio/news/new` | Create a news post |
| `/studio/news/[id]` | Edit one news post |
| `/studio/signal-clouds` | Visitor questions and answer labels |
| `/studio/readiness` | Content Doctor publish review |
| `/studio/help` | Safe studio access and publishing guidance |

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

1. **Clients:** use **Atelier Desktop** (see [`desktop/README.md`](../../desktop/README.md)) — no terminal required after handoff.
2. **Operators:** start with `npm run studio:launch` from the client site folder.
3. Bind to localhost only — do not expose the dev server on your network.
4. `/studio` write routes are disabled in production builds. Never set `ATELIER_STUDIO=1` on Vercel or other hosted environments.
5. Preview visitor pages at `http://127.0.0.1:5173/` in a separate tab after saving.
6. **Publish:** open `/studio/readiness` and click **Put site online** (or **Metti online**). No terminal commands required.
7. Keep Git backups before large edits. Item photos live in `static/images/items/`.

Open `/studio/help` for this guidance in the studio UI.

## Related docs

- [`../architecture/adr-0007-production-safe-studio-desktop.md`](../architecture/adr-0007-production-safe-studio-desktop.md) — production-safe authoring decision (Path B)
- [`../architecture/adr-0002-local-studio-research.md`](../architecture/adr-0002-local-studio-research.md)

## What the studio does not do

- initialize Git (operator sets this up at handoff);
- link Vercel or GitHub (operator sets this up at handoff);
- expose write access on the public production URL.

## Before publishing

Open **`/studio/readiness`** in Atelier Desktop or local studio:

1. Review **Content Doctor** notes in plain language.
2. Click **Put site online** / **Metti online** when ready.

The studio runs content checks, build, save, and deploy in the background. You see plain-language success or failure messages; technical details are optional.

**Operator alternative:** from the project folder:

```bash
npm run publish
npm run publish -- --deploy
```

Requires Git `origin`, credentials and a linked Vercel project — configured during operator handoff, not by the client.

See [`deploy-vercel.md`](deploy-vercel.md) and [`../product/service-package.md`](../product/service-package.md).

## Related docs

- [`../architecture/adr-0007-production-safe-studio-desktop.md`](../architecture/adr-0007-production-safe-studio-desktop.md)
- [`../architecture/adr-0003-publishing-and-service-model.md`](../architecture/adr-0003-publishing-and-service-model.md)
- [`../product/product-levels.md`](../product/product-levels.md)
- [`../product/no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`content-doctor.md`](content-doctor.md)
