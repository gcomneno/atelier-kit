# Deploy to Vercel

Atelier-Kit is configured to use the Vercel adapter.

It does not require a database in version 1.0.

## Pre-deploy checklist

Run locally:

```bash
npm run item:list
npm run item:validate
npm run check
npm run build
```

Review content:

- `config/site.yaml`
- `config/catalog.yaml`
- `config/signal-clouds.yaml`
- `content/items/`
- `static/images/items/`

Make sure:

- demo notices are removed or intentionally kept;
- every item image exists;
- every item page opens;
- Signal Cloud labels are final enough to publish;
- the repository visibility matches your intent.

## Local production preview

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

## Deploy with Vercel CLI

First deploy:

```bash
npx vercel
```

Production deploy:

```bash
npx vercel --prod
```

## Vercel project settings

Usually no custom settings are required.

Default expectations:

- framework: SvelteKit;
- install command: `npm install` or `npm ci`;
- build command: `npm run build`;
- output handled by `@sveltejs/adapter-vercel`.

## Privacy note

Atelier-Kit 1.0 stores Signal Cloud selections only in the visitor browser through `localStorage`.

No server-side signal database is created by this template.
