# Customization guide

Atelier-Kit is customized through YAML files and static images.

This guide shows the recommended first path from clone to customized local preview.

## Recommended first path

Start from a clean checkout:

```bash
npm install
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

Create your first item:

```bash
npm run item:new -- my-first-item "My First Item"
```

List items:

```bash
npm run item:list
```

Edit the generated file:

```text
content/items/my-first-item.yaml
```

Run the dev server:

```bash
npm run dev
```

Open the homepage and the item detail page:

```text
/
/items/my-first-item
```

## Site identity

Edit:

```text
config/site.yaml
```

Example:

```yaml
site:
  name: "My Handmade Studio"
  tagline: "Small handmade objects for quiet homes"
  language: "en"
  notice: "Demo content. Replace before publishing."
  footer_note: "Built with Atelier-Kit"
```

## Catalog vocabulary

Edit:

```text
config/catalog.yaml
```

Items always live under:

```text
/items
```

Atelier-Kit 1.0 intentionally does not support configurable route segments.

## Item/Card CRUD

Atelier-Kit 1.0 uses file-based CRUD.

### Create an item

Use the helper command:

```bash
npm run item:new -- my-item "My Item"
```

This creates:

```text
content/items/my-item.yaml
```

Then edit the generated YAML file.

Add an image:

```text
static/images/items/my-item.jpg
```

Then update the item YAML:

```yaml
image_file: "/images/items/my-item.jpg"
```

### Read items

The homepage lists all items automatically.

Each item is available at:

```text
/items/<id>
```

### Update an item

Edit the corresponding YAML file or replace its image.

Then run:

```bash
npm run item:validate
```

### Delete an item

Remove the YAML file from:

```text
content/items/
```

Optionally remove the unused image from:

```text
static/images/items/
```

Then run:

```bash
npm run item:list
npm run item:validate
```

## Signal Clouds

Edit:

```text
config/signal-clouds.yaml
```

Each cloud is single-choice.

A visitor can select one answer per cloud for each item. Selecting a different answer replaces the previous local selection.

Do not remove old ids if published data or browser selections may already exist. Prefer disabling or renaming labels.

## Pre-publish checklist

Before publishing a customized showcase, run:

```bash
npm run item:list
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

Also check manually:

- homepage title and tagline;
- all item cards;
- each item detail page;
- image paths;
- Signal Cloud labels;
- footer text;
- absence of demo-only notices.


## Meta information

Use `meta` to customize item detail fields without adding hardcoded properties.

Example:

```yaml
meta:
  - label: "Material"
    value: "Ceramic"

  - label: "Availability"
    value: "Available on request"

  - label: "Object details"
    children:
      - label: "Finish"
        value: "Matte glaze"
      - label: "Base"
        value: "Wooden support"
```

Recommended first-level entries:

- material;
- dimensions;
- availability;
- object details;
- care;
- provenance;
- notes.

Prefer clear labels over too much nesting.


## Visitor Brief

Visitor Brief is generated from Signal Cloud selections on item detail pages.

It gives visitors a short note they can copy and paste into an external contact channel.

This supports a contact flow without adding a textarea, form backend, database or server-side message storage.
