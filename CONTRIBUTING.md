# Contributing to Atelier-Kit

Thank you for your interest in Atelier-Kit.

This project is a **micro-CMS for creative showcases** — a lightweight, file-based kit for makers, artists and small creative activities. It is not a generic WordPress replacement, ecommerce platform or hosted SaaS.

Please read [`docs/product/micro-cms-positioning.md`](docs/product/micro-cms-positioning.md) before proposing large changes.

## Ways to contribute

- **Bug reports** — use the [Bug report](https://github.com/gcomneno/atelier-kit/issues/new?template=bug_report.yml) template.
- **Feature ideas** — use the [Feature request](https://github.com/gcomneno/atelier-kit/issues/new?template=feature_request.yml) template.
- **Documentation fixes** — use the [Documentation](https://github.com/gcomneno/atelier-kit/issues/new?template=documentation.yml) template.
- **Pull requests** — welcome for focused fixes and improvements that match project scope.

Blank issues are disabled. Always pick a template so maintainers can triage quickly.

## Before opening an issue

Search [existing issues](https://github.com/gcomneno/atelier-kit/issues) first.

**Please do not open issues for:**

- generic WordPress / Shopify / Etsy comparisons without a concrete Atelier-Kit gap;
- paid setup or customization requests (see [Support](#support) below);
- SEO spam, link drops, or unrelated promotions;
- support for heavily customized client forks without a minimal reproduction on the main kit;
- features explicitly out of scope: ecommerce, public comments, visitor accounts, analytics, plugin marketplace, multi-user CMS roles.

Off-topic or low-effort issues may be closed without reply.

## Development setup

```bash
git clone https://github.com/gcomneno/atelier-kit.git
cd atelier-kit
npm install
npm run dev
```

## Pull request checklist

Run these before submitting:

```bash
npm run content:validate
npm run check
npm run build
```

For content or YAML changes:

```bash
npm run content:doctor
```

### PR guidelines

- **One concern per PR** — bug fix, single feature, or doc update.
- **Match existing style** — read surrounding code before editing.
- **Keep diffs small** — avoid drive-by refactors.
- **Update docs** when behavior or CLI commands change.
- **No secrets** — never commit `.env`, tokens or client credentials.

## Project principles

Contributions should preserve:

- file-based YAML content (no database by default);
- static-friendly, small deployable output;
- privacy-friendly defaults (no visitor accounts, comments or tracking);
- separation between framework kit and client site folders;
- readable content that clients can inspect and export.

## Architecture and product docs

- [`docs/product/positioning.md`](docs/product/positioning.md)
- [`docs/product/micro-cms-positioning.md`](docs/product/micro-cms-positioning.md)
- [`docs/product/no-code-roadmap.md`](docs/product/no-code-roadmap.md)
- [`docs/architecture/`](docs/architecture/)

## Support

Atelier-Kit is open-source under the [MIT license](LICENSE).

- **Bugs and scoped features** → GitHub issues (templates above).
- **Paid setup, customization or handoff** → contact the maintainer directly, not via a generic issue.

## Code of conduct

Be direct, respectful and constructive. Assume good faith. Maintainers may close issues or PRs that do not fit scope or project capacity.
