# File-based collections

Collections let you group existing items into curated pages without adding a database, CMS or filtering system.

Collections are YAML files stored in:

```text
content/collections/
```

## Example

```yaml
id: "quiet-home"
title: "For a quiet home"
description: "Objects with a calm presence."
items:
  - example-item
  - ceramic-bowl
```

The `items` list references existing item ids from:

```text
content/items/
```

## Routes

Collections are rendered at:

```text
/collections
/collections/<id>
```

Item detail pages remain under:

```text
/items/<id>
```

## Editorial wording

Collection records under `content/collections/` define the individual curated
groups. Separate, collection-wide editorial wording can optionally live in:

```text
config/collections.yaml
```

Example:

```yaml
collections:
  home_eyebrow: "Series"
  page_eyebrow: "Browse the series"
```

The three collection labels have intentionally different responsibilities:

- the **Layout collections block label** is the structural heading used by
  configured Layout placements and navigation;
- `home_eyebrow` is the small editorial overline above the collections block
  on `/`;
- `page_eyebrow` is the small editorial overline on `/collections`.

Fallbacks remain backward compatible:

- an empty or missing `home_eyebrow` uses the localized Atelier-Kit Home
  default (`Collections` / `Collezioni`);
- an empty or missing `page_eyebrow` uses the effective Layout collections
  block label, then the localized collections default if no usable label is
  available.

Changing either eyebrow never renames the Layout block label. Existing client
sites do not need `config/collections.yaml`.

The same two fields are editable from **Studio → Collections**.

## Validation

Run:

```bash
npm run content:validate
```

The validator checks that:

- collection YAML files contain objects;
- collection ids are valid;
- collection ids match their filenames;
- titles and descriptions are present;
- item references are non-empty strings;
- referenced item ids exist;
- duplicate collection ids are rejected.

## Recommended use

Use collections for small curated selections, such as:

- featured work;
- seasonal selections;
- gift ideas;
- quiet home objects;
- available pieces.

Avoid using collections as a replacement for tags, search or a full CMS.
