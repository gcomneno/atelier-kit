# Customization recipes

These recipes show practical ways to customize Atelier-Kit for small creative showcases.

They are intentionally file-based.

No CMS. No database. No admin UI. No contact-form backend.

## Before choosing a recipe

Start with the reusable client intake brief:

- [`docs/client-intake.md`](../client-intake.md)

Use it to collect project identity, audience, tone, first items, collections, Signal Clouds, contact flow and publish-readiness notes before editing content files.

## Recipes

- [Handmade object showcase](handmade-object-showcase.md)
- [Artist portfolio](artist-portfolio.md)
- [Jewelry mini-catalog](jewelry-mini-catalog.md)
- [Collector showcase](collector-showcase.md) — cards, figurines, swaps via Signal Clouds + offline meetup
- [Small collection launch](small-collection-launch.md)
- [No-textarea contact flow](no-textarea-contact-flow.md)
- [Private preview before public launch](private-preview.md)
- [Replacing all demo content safely](replace-demo-content.md)

## Recommended flow

After applying any recipe, run:

```bash
npm run item:list
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

The doctor may warn about demo placeholders until you replace every starter value.
