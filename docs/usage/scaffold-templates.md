# Scaffold template boundaries

Atelier-Kit supports two related but different ways to start content for a creative showcase:

1. **Item meta presets** — starter `meta` fields when creating a single item.
2. **Site scaffold templates** — starter config, Signal Clouds, items and collections for a separate client site folder.

They solve different problems. Do not confuse them.

## Item meta presets

Item meta presets live in the item helper CLI.

They generate the `meta` block for one item file:

```bash
npm run item:new -- oil-study "Oil Study" -- --preset artwork
npm run item:new -- silver-ring "Silver Ring" -- --preset jewelry
```

Available presets:

- `default`
- `handmade`
- `artwork`
- `jewelry`
- `print`
- `furniture`
- `writing`

Use presets when you already have a site and only need a sensible starter item structure.

See [`item-presets.md`](item-presets.md).

## Site scaffold templates

Site scaffold templates live in the client scaffold command.

They copy Atelier-Kit into a separate folder and replace starter content across the whole site:

```bash
npm run site:scaffold -- ../client-site --template writing
npm run site:scaffold -- ../artist-site --template artwork
npm run site:scaffold -- ../quiet-clay --template handmade
npm run site:scaffold -- ../tiny-silver --template jewelry
npm run site:scaffold -- ../my-shelf --template collector
npm run site:scaffold -- ../quiet-room --template furniture
npm run site:scaffold -- ../family-archive --template genealogy
```

A scaffold template configures:

- site identity;
- catalog vocabulary;
- Signal Clouds;
- contact actions;
- one or more representative starter items;
- one starter collection.

Use scaffold templates when you want a separate client site with a use-case-specific starting point.

See [`client-scaffold.md`](client-scaffold.md).

## Currently supported scaffold templates

| Template | Use case | Item means | Collection means |
|---|---|---|---|
| `writing` | Authors, zines, narrative projects | novel, short story, narrative project | writing desk, reading path, curated group of works |
| `artwork` | Visual artists, sculptors, painters, illustrators, installations | artwork, sculpture, piece, installation | series, recent works, available works, exhibitions |
| `handmade` | Makers and small craft showcases | handmade object | curated selection, available pieces, seasonal group |
| `jewelry` | Small jewelry collections | jewelry piece | collection, available pieces, custom pieces |
| `collector` | Personal collections and swap showcases | collectible | personal shelf, set group, trade list |
| `furniture` | Furniture and object design showcases | furniture piece or object | room, material group, available pieces, custom work |
| `genealogy` | Public family histories and reviewed archives | person record | generation, family branch, research group |

### `writing`

```bash
npm run site:scaffold -- ../atelier-noir --template writing
```

Signal Clouds focus on atmosphere, reader interest and tone.

### `artwork`

```bash
npm run site:scaffold -- ../artist-site --template artwork
```

Signal Clouds focus on material, presence and visitor interest.

Visitor Brief selections are meant to support requests about a piece, a commission, a studio visit or collaboration.

### `handmade`

```bash
npm run site:scaffold -- ../quiet-clay --template handmade
```

Signal Clouds focus on material, use case, style and visitor interest.

Visitor Brief selections are meant to support requests about an object or custom work.

### `jewelry`

```bash
npm run site:scaffold -- ../tiny-silver --template jewelry
```

Signal Clouds focus on material, size, occasion and visitor interest.

Visitor Brief selections are meant to support requests about a piece, sizing, availability or custom work.

### `collector`

```bash
npm run site:scaffold -- ../my-shelf --template collector
```

Signal Clouds focus on trade intent, meetup preference, looking-for and condition.

Visitor Brief selections are meant to support offline swap conversations with parent-friendly meetup options.

### `furniture`

```bash
npm run site:scaffold -- ../quiet-room --template furniture
```

Signal Clouds focus on material, room, use case and visitor interest.

Visitor Brief selections are meant to support requests about a piece, dimensions, availability or commission.

### `genealogy`

```bash
npm run site:scaffold -- ../family-archive --template genealogy
```

Creates fictional people across three generations, with two-parent links, lateral spouse links, biographies, dates, places, placeholder portraits and a sample document link. It also configures the generic `/relationships` overview built with Atelier-Kit's relationship projector and the shared visitor `RelationshipGraph` component.

`parent`, `spouse`, `Mother` and similar terms are conventions in the generated item YAML. Atelier-Kit core still accepts any non-empty relationship `type`; it does not infer inverses, enforce a tree, or apply genealogy validation. See [`genealogy-scaffold.md`](genealogy-scaffold.md) before replacing the demo records or publishing.

## Use cases without a scaffold template

Some showcase types do not have a dedicated scaffold template yet.

Use manual setup with item meta presets when needed, for example:

- print catalogs → `--preset print`
- mixed creative catalogs spanning multiple showcase types
- highly custom client vocabularies

Collectors of cards, figurines and small objects can use the `collector` scaffold template instead of manual setup.

See [`manual-client-setup.md`](manual-client-setup.md).

## When to use a scaffold template

Use a scaffold template when:

- the client use case matches a supported template closely;
- you want a separate client folder instead of editing the framework repo;
- you want starter Signal Clouds and vocabulary aligned with the use case.

Do not force an unsuitable template just because it exists.

Examples:

- a painter with a small studio catalog → `artwork`
- an author with novels and short stories → `writing`
- a ceramic maker with functional objects → `handmade`
- a jeweler with rings and pendants → `jewelry`
- a kid or hobby collector with cards or figurines → `collector`
- a furniture maker with chairs and tables → `furniture`
- a reviewed public family history → `genealogy`
- a photographer selling prints → manual setup with `--preset print`

## When not to use a scaffold template

Use manual setup instead when:

- no current template matches the client use case;
- the client needs a mixed catalog that spans multiple showcase types;
- you only need one or two custom items inside an existing site;
- you want full control from the start and do not need starter copy.

See [`manual-client-setup.md`](manual-client-setup.md).

## What scaffold templates do not do

Scaffold templates do not:

- initialize Git;
- install dependencies;
- create a GitHub repository;
- deploy the site;
- parse a filled client intake brief automatically;
- add a CMS, database, admin UI, ecommerce or contact-form backend.

Those steps remain explicit and manual.

## Recommended workflow

1. Fill [`docs/client-intake.md`](../client-intake.md).
2. Choose a scaffold template or manual setup.
3. Run `npm run site:scaffold` when a template fits.
4. Replace placeholder identity, contact, item and collection content.
5. Run validation and build checks.
6. Initialize Git in the separate client folder.
7. Publish or deploy only when the content is ready.
