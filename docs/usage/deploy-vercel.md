# Deploy to Vercel

Atelier-Kit is configured to use the Vercel adapter.

## Local build

Run:

```bash
npm run check
npm run content:validate
npm run build
```

## Deploy

Use the Vercel CLI:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

## Notes

Atelier-Kit 1.0 does not require a database.

All content comes from YAML files and static images committed to the repository.
