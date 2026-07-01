# Customization guide

Atelier-Kit is customized through YAML files and static images.

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

You can also create a file manually.

Add a new YAML file:

```text
content/items/my-item.yaml
```

Add an image:

```text
static/images/items/my-item.jpg
```

Use this structure:

```yaml
id: my-item
title: "My Item"
subtitle: "Short optional subtitle"
status: "available"
material: "Replace with material"
dimensions: "Replace with dimensions"
availability: "Replace with availability"
price_mode: "Replace with price mode or hide prices"
image_file: "/images/items/my-item.jpg"
description: "Replace with a real description."
notice: ""
```

### Read items

The homepage lists all items automatically.

Each item is available at:

```text
/items/<id>
```

### Update an item

Edit the corresponding YAML file or replace its image.

### Delete an item

Remove the YAML file from:

```text
content/items/
```

Optionally remove the unused image from:

```text
static/images/items/
```

## Signal Clouds

Edit:

```text
config/signal-clouds.yaml
```

Each cloud is single-choice.

A visitor can select one answer per cloud for each item. Selecting a different answer replaces the previous local selection.

Do not remove old ids if published data or browser selections may already exist. Prefer disabling or renaming labels.

## Validate content

Run:

```bash
npm run content:validate
```
