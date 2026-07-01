# Contributing to Atelier-Kit

Atelier-Kit is a lightweight configurable showcase kit.

The project should stay small, understandable and deployable.

## Product rules

Atelier-Kit 1.0 should not include:

- user accounts;
- checkout;
- payments;
- public comments;
- contact forms;
- CRM features;
- multi-tenant SaaS features;
- database-backed dashboards.

## Development rules

Prefer:

- configuration over hardcoded content;
- YAML for human-editable content;
- simple components;
- clear validation;
- small commits;
- accessible UI;
- privacy-friendly defaults.

Avoid:

- feature creep;
- social-network patterns;
- public counters;
- collecting personal data without a strong reason;
- making the template depend on one specific creative field.

## Local workflow

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run check
npm run content:validate
npm run build
```
