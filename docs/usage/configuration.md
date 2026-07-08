# Configuration guide

Atelier-Kit is configured with YAML files.

The goal is to keep the project editable without requiring a database, CMS or admin dashboard.

## Configuration files

Atelier-Kit 1.0 has three main configuration files:

- `config/site.yaml`
- `config/catalog.yaml`
- `config/signal-clouds.yaml`

Content items live separately in:

- `content/items/`

Static images live in:

- `static/images/items/`

## Site configuration

Edit:

```text
config/site.yaml
```

Example:

```yaml
site:
  name: "My Handmade Studio"
  tagline: "Small handmade objects for quiet homes"
  language: "en"   # operator + visitor UI locale (en, it) and <html lang>
  notice: "Demo content. Replace before publishing."
  footer_note: ""
```

Fields:

- `name` is a legacy site label kept in sync when you save **Site identity** in Studio (`intro_title` or `header_title`). Optional — omit or leave empty for hero-first layouts.
- `tagline` appears near the home hero heading when set. Optional.
- `header_title` and `intro_title` (Studio → Site identity) control the visitor nav title and home hero heading respectively; both are optional.
- `language` sets `<html lang="…">`, the studio / CLI operator UI locale, **and** visitor-facing UI labels (`en`, `it`, `it-IT`, etc.). YAML content (item titles, about text, news bodies) is not auto-translated.
- `notice` can be used for demo warnings or short publishing notes.
- `footer_note` is optional client text on the home page when no multi-column footer is configured (`config/footer.yaml`). The **Atelier-Kit credit** (`Built with Atelier-Kit` / `Realizzato con Atelier-Kit`) is added automatically by the framework in the site footer and is not editable in YAML.
- `url` is an optional canonical public site URL (`https://…`). Used when building absolute Open Graph image links, the XML sitemap (`/sitemap.xml`), the news RSS feed (`/news/rss.xml`), and the `Sitemap:` line in `/robots.txt`. Leave empty to use the current request host.
- `og_image` is an optional social preview image for Facebook, Instagram and similar link unfurlers. Use a path under `/images/…` (for example `/images/site/og.jpg`) or a full `https://` URL. Recommended size: 1200×630.

## Discovery (sitemap and RSS)

Atelier-Kit generates a sitemap automatically at:

```text
/sitemap.xml
```

It lists public visitor routes built from your YAML content:

- home `/`
- all items `/items/<id>`
- collections index and detail pages (when you have collections)
- news index and posts (when you have news)
- about (when `config/about.yaml` exists)
- legal pages from `config/legal.yaml`

Set `site.url` in `config/site.yaml` to your production domain so search engines receive absolute URLs (for example `https://example.com/items/bracelet-a`). If `url` is empty, the sitemap uses the current request host (fine for previews; set `url` before go-live).

`/robots.txt` includes a `Sitemap:` reference when the site is served. No manual sitemap file is required.

When you publish news posts under `content/news/`, Atelier-Kit also serves an RSS 2.0 feed at:

```text
/news/rss.xml
```

Each entry includes title, date, excerpt (or first body line), link and optional image. The news index page (`/news`) links the feed with `<link rel="alternate" type="application/rss+xml">`. Set `site.url` so feed links use your production domain.

### Structured data (JSON-LD)

News detail pages (`/news/<slug>`) include a `BlogPosting` schema block: headline, publication date, description (excerpt or first body line), optional image, and publisher (`Organization` from `site.name`).

The about page (`/about`) includes an `AboutPage` schema block when `config/about.yaml` is present. The `mainEntity` is a `Person` when a portrait is configured, otherwise an `Organization` from `site.name`.

Data is built from the same YAML loaders as the visible page — no duplicate content source. Set `site.url` so absolute URLs in structured data match your production domain. You can verify output with [Google Rich Results Test](https://search.google.com/test/rich-results).

### On-site search

When you have items or news posts, the visitor header shows a search field. It filters **client-side** on item and news titles (and optional subtitles or excerpts). No backend or database is required; the index is built at build time from your YAML files.

Keyboard navigation: arrow keys move between results, Enter opens the highlighted match, Escape closes the panel. Labels follow the site language (`site.language`).

### Publishing from the studio

Open **`/studio/readiness`** and click **Put site online**. Content Doctor runs first; the studio then validates, builds, and updates the live site without terminal commands. Git and deploy run in the background when the operator configured them at handoff.

## Catalog configuration

Edit:

```text
config/catalog.yaml
```

Example:

```yaml
catalog:
  item_name_singular: "creation"
  item_name_plural: "creations"

  fields:
    show_price: false
    show_availability: true
    show_material: true
    show_dimensions: true
    show_status: true
```

Rules:

- items always live under `/items`;
- configurable route segments are intentionally out of scope for Atelier-Kit 1.0;
- field visibility should stay simple and predictable.

## Signal Cloud configuration

Edit:

```text
config/signal-clouds.yaml
config/contact.yaml
```

Example:

```yaml
signal_clouds:
  - id: mood
    question: "What does this item suggest?"
    options:
      - id: calm
        label: "Calm"
      - id: playful
        label: "Playful"
      - id: ceremonial
        label: "Ceremonial"
```

Rules:

- each cloud represents one question;
- each option needs a stable `id`;
- each cloud is single-choice;
- browser-local selections are keyed by item id, cloud id and option id;
- no server-side storage is used in Atelier-Kit 1.0.

## Item configuration

Create an item with:

```bash
npm run item:new -- my-item "My Item"
```

This creates:

```text
content/items/my-item.yaml
```

Example item:

```yaml
id: "my-item"
title: "My Item"
subtitle: ""
status: "draft"
material: "Replace with material"
dimensions: "Replace with dimensions"
availability: "Replace with availability"
price_mode: "hidden"
image_file: "/images/items/placeholder.svg"
description: "Replace with a real description."
notice: "Draft item. Replace before publishing."
```

Rules:

- `id` should match the file name without `.yaml`;
- `image_file` must start with `/`;
- image paths are resolved from the `static/` directory;
- use `npm run item:validate` after editing content.

## Validation

Run:

```bash
npm run item:validate
npm run check
npm run build
```

Content validation catches missing required fields, duplicate ids and missing images.


## Nested meta information

Item YAML files can define a generic `meta` array.

Example:

```yaml
meta:
  - label: "Material"
    value: "Ceramic"

  - label: "Dimensions"
    value: "12 × 8 cm"

  - label: "Object details"
    children:
      - label: "Finish"
        value: "Matte glaze"
      - label: "Care"
        value: "Dust gently"
```

Rules:

- every meta entry needs a `label`;
- each entry must have either a non-empty `value` or non-empty `children`;
- children use the same structure as parent entries;
- nested meta is rendered on item detail pages;
- this is still file-based configuration, not a CMS.


## Contact configuration

Edit:

```text
config/contact.yaml
```

Use this file to enable optional Visitor Brief contact actions.

Example:

```yaml
contact:
  email:
    enabled: true
    label: "Email this brief"
    address: "hello@example.com"
    subject_prefix: "Interest in"

  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
    phone: ""
```

Rules:

- disabled channels are not shown;
- email uses a `mailto:` link;
- WhatsApp uses a `wa.me` link;
- no message is sent automatically;
- no message is stored by Atelier-Kit.
