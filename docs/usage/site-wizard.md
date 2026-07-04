# Guided site setup wizard

The site wizard is Atelier-Kit Level 2 guided setup.

It asks plain-language questions and generates starter site content without manual YAML editing for the first setup pass.

Non-interactive example:

```bash
npm run site:wizard -- --yes --template handmade --target ../quiet-clay \
  --site-title "Quiet Clay Studio" --tagline "Small handmade objects" \
  --email studio@example.com
```

Update the current folder only:

```bash
npm run site:wizard -- --in-place
```

Interactive examples:

```bash
npm run site:wizard
npm run site:wizard -- --template artwork
```

## What the wizard collects

- target folder, when creating a new client site;
- use case / scaffold template;
- site title and tagline;
- language;
- contact email;
- optional WhatsApp contact;
- optional public site notice;
- optional first item title;
- optional collection title.

## What the wizard generates

For a new client site, the wizard:

1. runs the selected scaffold template;
2. patches site identity and contact settings;
3. optionally renames starter item and collection titles;
4. runs structural validation;
5. prints next-step instructions.

For `--in-place`, the wizard only updates:

- `config/site.yaml`
- `config/contact.yaml`

## What the wizard does not do

The wizard does not:

- install dependencies;
- initialize Git;
- deploy the site;
- upload images;
- replace every placeholder automatically;
- remove the need for preview and publish checks.

## After running the wizard

```bash
cd ../client-site
npm install
npm run dev
npm run content:doctor
npm run check
npm run build
```

Replace starter images and any remaining placeholder text before publishing.

## Related docs

- [`product-levels.md`](../product/product-levels.md)
- [`no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`client-scaffold.md`](client-scaffold.md)
- [`manual-client-setup.md`](manual-client-setup.md)
