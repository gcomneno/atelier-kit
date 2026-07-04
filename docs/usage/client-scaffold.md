# Client site scaffold

Atelier-Kit can be copied into a separate client site folder with a small starter template.

This is useful when you want to use Atelier-Kit as a product base instead of editing the framework repository directly.

## Command

```bash
npm run site:scaffold -- ../atelier-noir --template writing
```

The target path is relative to the Atelier-Kit repository.

## Supported templates

### `writing`

Creates a starter author/writing showcase.

It maps Atelier-Kit concepts like this:

- Item = novel, short story or narrative project.
- Collection = writing desk, reading path or curated group of works.
- Signal Clouds = atmosphere, reader interest and tone.
- Visitor Brief = a copyable message based on the visitor's selections.
- Contact actions = configured email and optional WhatsApp.

## What the scaffold does

The scaffold command:

- copies Atelier-Kit into a separate target folder;
- excludes `.git`, `node_modules`, `.svelte-kit` and `.vercel`;
- replaces starter item content with a writing placeholder;
- creates a starter writing collection;
- configures starter Signal Clouds for a writing showcase;
- keeps the generated site file-based and editable.

## What it does not do

The scaffold command does not:

- initialize Git;
- install dependencies;
- create a GitHub repository;
- deploy the site;
- read or parse a filled client intake brief;
- add a CMS, database, admin UI, ecommerce, blog or contact form backend.

Those steps remain explicit and manual.

## Replacing an existing target

By default, the command fails if the target already exists.

Use `--force` only when you intentionally want to delete and recreate the target folder:

```bash
npm run site:scaffold -- ../atelier-noir --template writing --force
```

## After scaffolding

Run the generated site checks from the new client folder:

```bash
cd ../atelier-noir

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
2. Run the scaffold command.
3. Replace placeholder identity, contact, item and collection content.
4. Run validation and build checks.
5. Initialize Git in the separate client folder.
6. Publish or deploy only when the content is ready.
