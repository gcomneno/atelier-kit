# Vercel deploy button for client sites

Use this after a client site repo is on GitHub and passes `npm run publish` locally.

## Prerequisites

- GitHub repository for the client site;
- Vercel account;
- local publish prep completed once.

## Deploy button markdown

Replace `YOUR_GITHUB_USER` and `YOUR_REPO_NAME`:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USER%2FYOUR_REPO_NAME&project-name=YOUR_REPO_NAME&framework=sveltekit&build-command=npm%20run%20build&install-command=npm%20install)
```

Example for a demo repo:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgcomneno%2Fluna-argento&project-name=luna-argento&framework=sveltekit&build-command=npm%20run%20build&install-command=npm%20install)
```

Add this to the client repo `README.md` or `DEPLOY.md`.

## Operator workflow

1. Scaffold or wizard-create the client site.
2. Edit content in studio.
3. Run `npm run publish`.
4. Push to GitHub.
5. Click the deploy button or run `npm run publish -- --deploy`.

## Notes

- The button clones the repo into Vercel; it does not replace Content Doctor review.
- Keep repository visibility aligned with client privacy needs.
- Custom domains are configured in Vercel after the first deploy.

## Related docs

- [`deploy-vercel.md`](deploy-vercel.md)
- [`../product/service-package.md`](../product/service-package.md)
- [`../architecture/adr-0003-publishing-and-service-model.md`](../architecture/adr-0003-publishing-and-service-model.md)
