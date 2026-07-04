# Recipe: small collection launch

Use this recipe when you want to publish a small curated launch page.

Example: a seasonal drop, a set of available pieces, a gift selection or a studio update.

## Files to edit

```text
content/items/
content/collections/
config/site.yaml
```

## 1. Create items

```bash
npm run item:new -- linen-pouch "Linen Pouch" -- --preset handmade
npm run item:new -- small-bowl "Small Bowl" -- --preset handmade
npm run item:new -- table-print "Table Print" -- --preset print
```

Edit each generated YAML file and replace:

- title;
- image_file;
- image_alt;
- description;
- notice;
- meta values.

## 2. Create collection

```yaml
id: "spring-table"
title: "Spring table"
description: "A small selection of quiet pieces for the table."
items:
  - linen-pouch
  - small-bowl
  - table-print
```

Save it as:

```text
content/collections/spring-table.yaml
```

## 3. Use collection order intentionally

The order in `items` is the public order on the collection page.

```yaml
items:
  - small-bowl
  - linen-pouch
  - table-print
```

## 4. Publish checks

```bash
npm run content:validate
npm run content:doctor
npm run check
npm run build
```

If a collection references a missing item id, validation fails.
