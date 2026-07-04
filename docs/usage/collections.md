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
