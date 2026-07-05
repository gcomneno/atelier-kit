# Client site scaffold

Atelier-Kit can be copied into a separate client site folder with a small starter template.

This is useful when you want to use Atelier-Kit as a product base instead of editing the framework repository directly.

## Command

```bash
npm run site:scaffold -- ../atelier-noir --template writing
npm run site:scaffold -- ../artist-site --template artwork
npm run site:scaffold -- ../quiet-clay --template handmade
npm run site:scaffold -- ../tiny-silver --template jewelry
npm run site:scaffold -- ../quiet-room --template furniture
```

The target path is relative to the Atelier-Kit repository.

## Supported templates

See [`scaffold-templates.md`](scaffold-templates.md) for template boundaries, planned templates and when to use manual setup instead.

### `writing`

Creates a starter author/writing showcase.

It maps Atelier-Kit concepts like this:

- Item = novel, short story or narrative project.
- Collection = writing desk, reading path or curated group of works.
- Signal Clouds = atmosphere, reader interest and tone.
- Visitor Brief = a copyable message based on the visitor's selections.
- Contact actions = configured email and optional WhatsApp.

### `artwork`

Creates a starter visual-art showcase for painters, sculptors, illustrators and installation artists.

It maps Atelier-Kit concepts like this:

- Item = artwork, sculpture, piece or installation.
- Collection = series, recent works, available works or exhibitions.
- Signal Clouds = material, presence and visitor interest.
- Visitor Brief = request information about a piece, commission, studio visit or collaboration.
- Contact actions = configured email and optional WhatsApp.

### `handmade`

Creates a starter craft showcase for makers and small handmade-object catalogs.

It maps Atelier-Kit concepts like this:

- Item = handmade object.
- Collection = curated selection, available pieces or seasonal group.
- Signal Clouds = material, use case, style and visitor interest.
- Visitor Brief = request information about an object or custom work.
- Contact actions = configured email and optional WhatsApp.

### `jewelry`

Creates a starter jewelry showcase for rings, pendants, earrings and small wearable collections.

It maps Atelier-Kit concepts like this:

- Item = jewelry piece.
- Collection = collection, available pieces or custom pieces.
- Signal Clouds = material, size, occasion and visitor interest.
- Visitor Brief = request information about a piece, sizing, availability or custom work.
- Contact actions = configured email and optional WhatsApp.

### `furniture`

Creates a starter furniture and object-design showcase for chairs, tables, shelves, lamps and interior pieces.

It maps Atelier-Kit concepts like this:

- Item = furniture piece or interior object.
- Collection = room, material group, available pieces or custom work.
- Signal Clouds = material, room, use case and visitor interest.
- Visitor Brief = request information about a piece, dimensions, availability or commission.
- Contact actions = configured email and optional WhatsApp.

## What the scaffold does

The scaffold command:

- copies Atelier-Kit into a separate target folder;
- excludes `.git`, `node_modules`, `.svelte-kit` and `.vercel`;
- replaces starter item and collection content for the chosen template;
- configures starter Signal Clouds for the chosen use case;
- keeps the generated site file-based and editable.

## What it does not do

The scaffold command does not:

- initialize Git;
- install dependencies;
- create a GitHub repository;
- deploy the site;
- read or parse a filled client intake brief;
- add a CMS, database, admin UI, ecommerce, blog or contact-form backend.

Those steps remain explicit and manual.

If no template fits, use [`manual-client-setup.md`](manual-client-setup.md).

## Replacing an existing target

By default, the command fails if the target already exists.

Use `--force` only when you intentionally want to delete and recreate the target folder:

```bash
npm run site:scaffold -- ../artist-site --template artwork --force
```

## After scaffolding

Run the generated site checks from the new client folder:

```bash
cd ../artist-site

npm install

npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

`content:doctor` should warn about placeholders. That is expected until the scaffold content is replaced with real client content.

For a public launch pass, use:

```bash
npm run content:doctor -- --strict
```

## Recommended workflow

1. Fill `docs/client-intake.md` with the client.
2. Choose a scaffold template or manual setup path.
3. Run the scaffold command.
4. Replace placeholder identity, contact, item and collection content.
5. Run validation and build checks.
6. Initialize Git in the separate client folder.
7. Publish or deploy only when the content is ready.

## Upgrading an existing client site

When Atelier-Kit ships new studio features or fixes, sync framework code into a client folder without touching client content:

```bash
cd ../client-site
npm run site:upgrade -- --from ../atelier-kit
```

The command:

- copies `src/` and `scripts/` from the kit;
- merges npm scripts from the kit `package.json`;
- prints a diff summary and asks for confirmation (use `--yes` to skip);
- never overwrites `config/`, `content/` or `static/images/items/`.

Preview only:

```bash
npm run site:upgrade -- --from ../atelier-kit --dry-run
```

From the kit repository, target a client folder directly:

```bash
npm run site:upgrade -- --target ../luna-argento --from .
```

After upgrading, run `npm run check` and `npm run build` in the client folder.

Tag the kit release (`git tag vX.Y.Z`) before upgrading clients so `.atelier-kit-upgrade.json` records the correct version.
