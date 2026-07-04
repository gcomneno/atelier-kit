# ADR 0003: Publishing and service model

## Status

Accepted

## Context

Atelier-Kit is moving from developer-assisted setup toward guided and visual authoring (epic [#35](https://github.com/gcomneno/atelier-kit/issues/35)).

Phase 3 added a local studio prototype. Phase 4 requires a realistic answer to:

- how a non-technical client publishes a site;
- how the product can be delivered commercially without becoming a hosted CMS;
- what infrastructure and pricing expectations are reasonable.

Issue [#40](https://github.com/gcomneno/atelier-kit/issues/40) tracks this research.

## Decision

Atelier-Kit will use a **kit + service + guided deploy** model as the primary commercial path.

### 1. Primary delivery model — setup service

The recommended way to serve real clients is:

1. intake brief;
2. `site:wizard` or scaffold;
3. studio editing for site, about, catalog, items, collections, signal clouds;
4. Content Doctor review;
5. `npm run publish`;
6. optional Vercel deploy;
7. short handoff notes.

This preserves the file-based architecture and avoids operating a multi-tenant SaaS.

See [`service-package.md`](../product/service-package.md).

### 2. Technical publishing path

The default publish workflow is:

```bash
npm run publish
npm run publish -- --deploy
```

Steps:

- structural validation;
- Content Doctor;
- `check`;
- `build`;
- optional `vercel --prod`.

Studio exposes the same readiness information at `/studio/readiness`.

### 3. Supported packaging options

| Option | Role | Default? |
|---|---|---|
| A. Kit + service | freelancer / studio sets up client sites | yes |
| B. Local studio | client edits content in browser on localhost | yes |
| C. Vercel deploy button / CLI | production hosting | yes |
| D. ZIP export | offline handoff | later |
| E. Desktop wrapper | hide terminal for studio + publish | research |
| F. Hosted SaaS editor | full no-code platform | no |

Options D–F remain research-only until a clear need appears.

### 4. Cost expectations

For a small creative showcase (5–20 items, no shop, no accounts):

| Item | Typical cost |
|---|---|
| Vercel Hobby | €0 for demo/personal use |
| Vercel Pro | ~$20/month if commercial team hosting is required |
| Custom domain | ~€10–15/year optional |
| Database | €0 — not used |
| Atelier-Kit service setup | €300–800 one-time (operator-defined) |

### 5. Non-goals

This decision does **not** require:

- a hosted multi-tenant CMS;
- in-app payments or checkout;
- automatic Git sync from studio;
- visitor accounts;
- replacing the YAML/file model.

## Consequences

Positive:

- clear commercial path without SaaS burden;
- publish workflow is scriptable and documentable;
- studio and CLI share the same readiness checks.

Trade-offs:

- first deploy still needs technical assistance for most clients;
- image upload is local-dev only until a packaging layer exists;
- service quality depends on operator process, not product automation alone.

## Related docs

- [`service-package.md`](../product/service-package.md)
- [`no-code-roadmap.md`](../product/no-code-roadmap.md)
- [`adr-0002-local-studio-research.md`](adr-0002-local-studio-research.md)
- [`deploy-vercel.md`](../usage/deploy-vercel.md)
