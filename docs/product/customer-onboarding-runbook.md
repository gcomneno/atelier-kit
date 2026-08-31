# Customer onboarding runbook

## Purpose and scope

This runbook defines the standard onboarding lifecycle for a customer-owned
Atelier-Kit site.

It materializes issue #322 as an operational product document. It does not
define pricing, commercial tiers, maintenance obligations, support obligations,
generic hosting operations, bespoke delivery or customer-specific
infrastructure.

Pricing belongs to #321.

Downstream boundaries are defined separately:

- maintenance and upgrades:
  [`maintenance-and-upgrade-contract.md`](maintenance-and-upgrade-contract.md)
  (#323);
- customer support:
  [`customer-support-contract.md`](customer-support-contract.md) (#324);
- bespoke work: `BESPOKE REVIEW`, not silent expansion of onboarding.

## Lifecycle

The canonical onboarding lifecycle is:

```text
qualify
  -> collect
  -> authorize
  -> choose path
  -> bootstrap
  -> configure
  -> validate
  -> deploy
  -> accept
  -> handoff
```

The controlled exits are:

- `REQUIRE INPUT`;
- `STOP`;
- `REFUSE`;
- `BESPOKE REVIEW`.

The only terminal success state is:

```text
ONBOARDING COMPLETE
```

No onboarding may be marked `ONBOARDING COMPLETE` until all required acceptance
criteria pass.

## Core authority rule

**No authority -> no mutation.**

Every repository, deployment, domain, provider-account, branch, path,
credential and state mutation requires explicit authority before the operation.

Access MUST be:

- explicit;
- least-privilege;
- scoped to the operation;
- revocable;
- appropriate for the specific repository, provider, domain, branch, path or
  deployment being changed.

Browser/client-provided values MUST NOT silently become deployment, repository,
branch, path, credential or mutation authority.

UI state, form values, query parameters, uploaded files, copied URLs and
customer statements are inputs to verify. They are not authority by themselves.

## 1. Qualify

Before any mutation, determine whether the customer fits the supported
Atelier-Kit operating model.

### Gate inputs

Collect enough information to classify:

- intended site/product shape;
- expected content model and public routes;
- supported showcase requirements versus bespoke requirements;
- expected authoring workflow;
- expected deployment/provider arrangement;
- repository, domain and provider-account ownership;
- whether private Hosted Studio is needed;
- required launch timing or external dependencies;
- prerequisites for the chosen onboarding path.

### Supported fit

Proceed only when the requested site is a bounded creative showcase that can be
represented by supported Atelier-Kit configuration, content, media and fixed
routes.

Typical supported needs include:

- public portfolio, catalog, collection, news, about, legal and contact
  content;
- bounded visual authoring through Local Studio, Atelier Desktop or explicitly
  provisioned private Hosted Studio;
- static-friendly public Visitor deployment;
- customer-owned files, Git history and portable YAML content.

### Bespoke or unsupported fit

Exit to `BESPOKE REVIEW` when the customer needs work outside the standard
product contract but the request may be separately scoped.

Typical examples include:

- ecommerce, cart, checkout or payments;
- visitor accounts, membership, comments or community features;
- arbitrary page building or plugin behavior;
- custom application backends;
- complex editorial roles or multi-tenant SaaS behavior;
- large archive migration, redesign or custom integration work;
- modifications that would make future Kit maintenance non-deterministic.

Exit to `REFUSE` when the requested outcome would violate Atelier-Kit security,
privacy, ownership or product boundaries.

Exit to `REQUIRE INPUT` when qualification cannot be completed because required
facts or evidence are missing.

Exit to `STOP` when the customer withdraws, the engagement is paused, or an
external dependency blocks progress without a safe next operation.

### Gate output

Qualification produces one of:

- proceed with supported onboarding;
- `REQUIRE INPUT`;
- `STOP`;
- `REFUSE`;
- `BESPOKE REVIEW`.

## 2. Collect the minimum customer packet

Before bootstrap, collect the minimum information and evidence needed to create
or adopt the customer workspace.

The packet MUST include:

- customer identity and responsible legal/operational contact;
- public site identity: title, tagline, language, contact channels and public
  metadata;
- intended repository owner, repository name and canonical branch;
- evidence of repository ownership or explicit permission to create/adopt it;
- deployment/provider ownership and the intended production target;
- domain names, origins and DNS ownership evidence when a custom domain is in
  scope;
- initial configuration choices needed for a valid site;
- initial content and assets needed for bootstrap;
- responsible customer/operator contacts for content approval and technical
  decisions;
- required authorization/access evidence for each planned mutation;
- chosen onboarding path prerequisites;
- whether Hosted Studio is selected and, if so, Hosted-specific provisioning
  prerequisites.

The packet MUST NOT require secrets to be stored in this runbook.

Secrets, tokens, OAuth credentials, provider credentials, session cookies,
private keys and Redis credentials remain server-only or provider-managed
secrets according to the relevant runtime and provider boundary.

If the minimum packet is incomplete, exit `REQUIRE INPUT`.

## 3. Authorize

Authorization happens before any mutation.

For each planned operation, record:

- the actor performing the operation;
- the target repository, branch, path, deployment, provider account, domain or
  state store;
- the authority source;
- the exact permission scope;
- whether access is revocable;
- the operation being authorized;
- the evidence retained for acceptance or audit.

Do not proceed when authority is ambiguous, contradictory, inherited from the
wrong runtime, broader than required, or supplied only by browser/client state.

## 4. Choose onboarding path

Choose one path:

| Path | Appropriate when |
| --- | --- |
| Wizard | Intake answers are complete enough for guided creation and the customer site fits an existing supported template/preset. |
| Scaffold | The target workspace should start from a supported template, but configuration/content will be filled or reviewed manually after creation. |
| Manual | The site requires careful adoption, recovery, unusual repository state, or operator-controlled setup that should not be hidden behind guided defaults. |

The paths differ only in operator workflow.

They MUST converge on the same Atelier-Kit application/domain contract,
customer-owned content model, validation expectations and acceptance gates.

Do not claim semantic product differences between Wizard, Scaffold and Manual
outputs.

## 5. Bootstrap

Bootstrap creates or adopts the customer workspace and installs the initial
managed Atelier-Kit structure.

Bootstrap MUST:

- operate only against the authorized target;
- preserve existing customer-owned content and history;
- distinguish Kit-managed files from customer-owned files;
- identify extension or bespoke surfaces before mutation;
- avoid blind overwrite;
- leave recoverable evidence of the resulting repository/workspace state.

The normal ownership surfaces are:

| Surface | Meaning |
| --- | --- |
| Kit-managed | Atelier-Kit source, scripts and finite runtime requirements that may be synchronized by supported Kit workflows. |
| Customer-owned | `config/`, `content/`, supported customer media, repository history, domain/account ownership and customer-authored copy/assets. |
| Extension/bespoke | Custom code, design changes, preserved core-managed paths, integrations or behavior outside supported product contracts. |

If bootstrap cannot preserve customer-owned data, exit `STOP` or `REFUSE`
depending on whether a safe remediation path exists.

If custom surfaces need evaluation before standard onboarding can proceed, exit
`BESPOKE REVIEW`.

## 6. Configure

Configure only the supported settings required to reach a valid customer site.

Configuration SHOULD cover:

- site identity, language, public metadata and contact channels;
- appearance and supported layout choices;
- initial items, collections, news, about, legal and Signal Cloud/FAQ content
  where in scope;
- media paths and alt text for supplied assets;
- public deployment target metadata;
- authoring workflow selected for handoff.

Visitor remains the ordinary public read-only runtime.

Private Hosted Studio is optional and separate. It is not inferred from Visitor
configuration and is not Local Studio enabled on a public deployment.

If Hosted Studio is selected, onboarding MUST verify explicit provisioning for:

- the separate Hosted authoring deployment;
- server-controlled repository owner, repository, branch and writable roots;
- canonical Hosted origin;
