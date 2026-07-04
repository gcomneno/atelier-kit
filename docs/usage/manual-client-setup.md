# Manual client setup when no scaffold template fits

Use this guide when the client use case does not match a supported scaffold template closely enough.

Atelier-Kit remains file-based and CMS-free. Manual setup is a valid first-class workflow, not a fallback for failure.

## When to choose manual setup

Choose manual setup when:

- no supported scaffold template matches the client use case;
- the client needs a mixed catalog across multiple creative types;
- you want to start from the default Atelier-Kit demo and reshape it deliberately;
- you prefer full control over every config file from the beginning.

Do not force an unsuitable scaffold template just to avoid editing YAML.

See [`scaffold-templates.md`](scaffold-templates.md) for the current template list and boundaries.

## Manual setup workflow

### 1. Create a separate client folder

Copy Atelier-Kit into a new folder outside the framework repository:

```bash
npm run site:scaffold -- ../client-site --template writing --force
```

Then replace the writing-specific starter content manually.

Or copy the repository without applying a use-case template:

```bash
rsync -a --exclude node_modules --exclude .git --exclude .svelte-kit --exclude .vercel \
  ./ ../client-site/
cd ../client-site
```

The scaffold command is still useful for the copy step even when you plan to replace most starter content immediately.

### 2. Install dependencies

```bash
cd ../client-site
npm install
```

### 3. Edit site identity

Edit `config/site.yaml`:

```yaml
site:
  name: "Small Room Studies"
  tagline: "Paintings, visual notes and quiet experiments"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
```

### 4. Edit catalog vocabulary

Edit `config/catalog.yaml`:

```yaml
catalog:
  item_name_singular: "work"
  item_name_plural: "works"

  fields:
    show_price: false
    show_availability: true
    show_material: true
    show_dimensions: true
    show_status: true
    show_meta: true
```

Adjust visible fields to match what the client actually wants to show.

### 5. Configure Signal Clouds

Edit `config/signal-clouds.yaml`.

Keep clouds focused on visitor intent. For an artist portfolio, useful questions include material, mood and interest in available work, commissions or studio visits.

See also [`docs/recipes/artist-portfolio.md`](../recipes/artist-portfolio.md).

### 6. Configure contact actions

Edit `config/contact.yaml`:

```yaml
contact:
  email:
    enabled: true
    label: "Email this brief"
    address: "studio@example.com"
    subject_prefix: "Interest in"

  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
    phone: ""
```

### 7. Replace demo items

Remove demo starter items if they are no longer needed:

```text
content/items/example-item.yaml
```

Create real items with the item helper and an appropriate meta preset:

```bash
npm run item:new -- blue-window-study "Blue Window Study" -- --preset artwork
npm run item:new -- bronze-figure "Bronze Figure" -- --preset artwork
npm run item:new -- ceramic-vessel "Ceramic Vessel" -- --preset handmade
```

Available presets are listed in [`item-presets.md`](item-presets.md).

Then edit each generated YAML file and add images under:

```text
static/images/items/
```

### 8. Create collections

Create one or more collection files under `content/collections/`.

Example:

```yaml
id: "window-studies"
title: "Window studies"
description: "Small works about light, silence and interior spaces."
items:
  - blue-window-study
```

Save as `content/collections/window-studies.yaml`.

See [`collections.md`](collections.md).

## Example: sculptor before a dedicated scaffold exists

A sculptor selling a small catalog of bronzes and mixed-media pieces may not need ecommerce, blog or comments.

Recommended approach:

1. Use manual setup or the `artwork` scaffold as a starting point if the visual-work mapping fits.
2. Set catalog vocabulary to `work` / `works`.
3. Create items with `--preset artwork` for wall pieces and `--preset handmade` for mixed-material objects if needed.
4. Group works into collections such as `recent-works`, `available-works` or `exhibitions`.
5. Configure Signal Clouds around material, presence and visitor interest.
6. Keep contact on email or WhatsApp through Visitor Brief, not a backend form.

If the `artwork` scaffold fits closely enough, start there instead:

```bash
npm run site:scaffold -- ../sculptor-site --template artwork
```

Then replace placeholder copy, images and collections with real studio content.

## Files to edit

| File or folder | Purpose |
|---|---|
| `config/site.yaml` | site name, tagline, notice, footer |
| `config/catalog.yaml` | item vocabulary and visible card/detail fields |
| `config/signal-clouds.yaml` | visitor preference questions |
| `config/contact.yaml` | email and optional WhatsApp actions |
| `content/items/` | item records |
| `content/collections/` | curated groups of items |
| `static/images/items/` | item images |

## Validation and publish readiness

Run these commands from the client site folder:

```bash
npm run item:list
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

Structural validation:

```bash
npm run content:validate
npm run item:validate
```

Publishing readiness:

```bash
npm run content:doctor
```

For a public launch pass:

```bash
npm run content:doctor -- --strict
```

The doctor warns about placeholder images, demo notices, example contact addresses and starter text. That is expected until real client content replaces every placeholder.

See [`content-doctor.md`](content-doctor.md) and [`deploy-vercel.md`](deploy-vercel.md).

## Client-ready checklist

Before handoff or deploy, confirm:

- [ ] site name and tagline are real client copy
- [ ] demo notice is removed or intentionally kept
- [ ] contact email or WhatsApp uses real client details
- [ ] every published item has a real image and description
- [ ] collections reference only existing item ids
- [ ] Signal Cloud questions match the client contact flow
- [ ] `content:doctor --strict` passes
- [ ] `npm run build` succeeds

## Related docs

- [`scaffold-templates.md`](scaffold-templates.md) — supported templates and boundaries
- [`client-scaffold.md`](client-scaffold.md) — scaffold command workflow
- [`client-intake.md`](../client-intake.md) — reusable first-site brief
- [`docs/recipes/artist-portfolio.md`](../recipes/artist-portfolio.md) — artist portfolio recipe
