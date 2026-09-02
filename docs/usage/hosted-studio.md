# Private Hosted Studio operator runbook

This is the canonical **general** operator runbook for explicitly provisioned
private Hosted Studio deployments.

It is not a record of one deployment that must remain alive forever. Read
[ADR 0008](../architecture/adr-0008-hosted-studio-architecture.md),
[ADR 0009](../architecture/adr-0009-hosted-studio-authentication-authorization.md),
[ADR 0010](../architecture/adr-0010-hosted-studio-persistent-state.md), and the
[Hosted Studio threat model](../security/hosted-studio-threat-model.md) for the
governing architecture and security controls.

Issue #275 created the first real Atelier-Kit validation deployment and proved
this operating model. That validation infrastructure has since been retired;
its evidence is preserved below as historical validation, not as current
runtime authority.

Consumer-specific runbooks define the current repository, branch, writable
roots, deployment identity, origin, OAuth callback, and state namespace for any
explicitly provisioned consumer Hosted Studio.

## Runtime and deployment boundary

These are distinct authority domains; do not transfer credentials or assumptions
between them.

| Mode | Purpose | Studio behavior |
| --- | --- | --- |
| Ordinary visitor production | Public client-facing site | `/studio/**` and `/auth/**` fail closed (404); no Hosted credentials. |
| Local Studio | Authoring from a checkout/Atelier Desktop | Filesystem edits and local Git/Vercel publishing remain local-only capabilities. |
| Private Hosted Studio | Separate, explicitly configured authoring deployment | Authenticated, authorized, GitHub-backed authoring with the admitted Hosted surface. |

A private Hosted Studio must be provisioned as separate infrastructure with its
own canonical HTTPS origin, server-side secrets, repository authority, and
persistent state. It must not inherit authority from Visitor, Demo, Local, or a
retired validation deployment.

No current general Atelier-Kit Hosted deployment name, hostname, branch, OAuth
callback, Redis resource, or state namespace is implied by this document. Those
values are deployment-specific and must be observed or provisioned explicitly.

## Persistent state topology

A deployed Hosted Studio uses the `persistent-redis` topology contract defined
by ADR 0010.

Redis owns transient Hosted security/session state such as OAuth transactions,
opaque session records, and session/CSRF-related secrets. Git/GitHub remains the
canonical editorial history and repository authority.

Production Hosted Studio must fail closed if persistent state is unavailable.
It must never silently fall back to process memory merely because an in-memory
adapter exists for tests, local development, or a single-process PoC role.

The first real validation used Upstash Redis through the Vercel Marketplace,
but provider identity is an implementation choice behind the persistent store
contract. A new deployment must provision its own state resource and namespace;
do not reuse a retired or unrelated deployment resource by default.

## Configuration and credentials

An explicitly provisioned private Hosted Studio requires the following runtime
configuration.

### Activation and non-secret configuration

```text
ATELIER_STUDIO_MODE=hosted
ATELIER_STUDIO_PRIVATE_POC=1
ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY=persistent-redis
```

### Deployment/security configuration

The concrete values are deployment-specific:

```text
ATELIER_STUDIO_CANONICAL_ORIGIN
ATELIER_STUDIO_GITHUB_CALLBACK_URL
ATELIER_STUDIO_GITHUB_CLIENT_ID
ATELIER_STUDIO_AUTHORIZED_GITHUB_IDS
ATELIER_STUDIO_GITHUB_REPOSITORY
ATELIER_STUDIO_GITHUB_BRANCH
ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS
ATELIER_STUDIO_STATE_NAMESPACE
ATELIER_STUDIO_STATE_REDIS_REST_URL
```

### Secrets

```text
ATELIER_STUDIO_GITHUB_CLIENT_SECRET
ATELIER_STUDIO_GITHUB_TOKEN
ATELIER_STUDIO_STATE_REDIS_REST_TOKEN
```

Never put secret values in documentation, issue comments, logs, browser data,
Git history, screenshots, or client-readable storage.

## GitHub OAuth and operator authorization

Each provisioned Hosted Studio needs an OAuth application/configuration whose
callback exactly matches:

```text
<ATELIER_STUDIO_CANONICAL_ORIGIN>/auth/github/callback
```

OAuth authentication identifies an operator; it does not grant repository or
Studio authority. Authorization uses the server-side allow-list of stable GitHub
numeric subjects.

An operator may discover their own numeric subject with:

```bash
gh api user --jq '.id'
```

Do not treat a historical validation subject, OAuth application, or callback as
a universal project default.

## Repository credential

Use a dedicated fine-grained GitHub repository credential for Hosted repository
writes, separate from the OAuth identity/token.

Restrict it to the intended repository and only the permissions required by the
authoring adapter: repository Contents read/write plus GitHub-required Metadata
read-only. Browser input must never select repository, branch, writable roots,
commit message, or provider credentials.

A future deployment may reuse an existing account-level OAuth application or
repository credential only after ownership and sharing have been reviewed
explicitly. Unknown credentials must be preserved rather than deleted or
silently repurposed.

## Save-to-deploy and Preview contract

A successful private Hosted save means the admitted repository mutation
succeeded and the configured authoring revision advanced. It does not grant the
browser generic deployment authority.

The operator-facing contract is:

1. **Authored revision** — the Hosted editor reports the repository-backed
   revision after a successful read/save.
2. **Deployment status** — a separate hosting concern unless a future explicit
   architecture change admits deployment orchestration.
3. **Preview** — may show a deployed Visitor snapshot that is older than the
   current authored revision.

A deployment delay or failure does not roll back, repeat, or otherwise alter an
already-successful repository mutation.

## Admitted Hosted surface

The reusable Hosted capability currently admits:

- `GET /studio`;
- `GET /studio/site/social`;
- `POST /studio/site/social`;
- `GET /studio/site/hero`;
- `POST /studio/site/hero`;
- `GET /auth/github/login`;
- `GET /auth/github/callback`;
- `POST /auth/logout`.

All other Studio routes/actions remain fail-closed unless separately admitted by
scoped work and tests. Local filesystem editing, Local Git, and Local Vercel-CLI
publishing are not Hosted capabilities.

Consumer-specific writable paths and image destinations remain server-owned and
must be documented in the relevant consumer runbook.

## Provisioning checklist

Before declaring a new private Hosted Studio operational:

1. provision a dedicated authoring project separate from Visitor production;
2. establish the exact canonical HTTPS origin;
3. configure the matching OAuth callback;
4. configure a stable numeric operator allow-list;
5. configure fixed repository, branch, writable roots, and server-owned mutation
   destinations;
6. provision deployment-capable persistent Redis state with an isolated
   namespace;
7. configure least-privilege repository credentials separately from OAuth;
8. verify Hosted secrets are absent from Visitor production;
9. deploy the intended source revision;
10. run the operator and failure-path smoke checks below.

Do not copy configuration from a historical or unrelated Hosted deployment just
because variable names match.

## Operator smoke test

Against the canonical authoring origin:

1. request `/studio` anonymously; it must enter authentication rather than expose
   authoring state;
2. authenticate as an allow-listed operator; `/studio` must expose only the
   admitted Hosted surface;
3. read an admitted editor and perform one controlled valid mutation;
4. submit a stale revision and confirm no repository advance;
5. submit an invalid/wrong CSRF or Origin request and confirm no mutation;
6. exercise an unadmitted Studio route and confirm fail-closed behavior;
7. logout with POST and confirm the next `/studio` requires authentication;
8. verify Visitor production still exposes no `/studio/**` or `/auth/**`
   authority;
9. verify persistent session/state behavior appropriate to the deployment
   topology;
10. verify no secret value appears in responses, logs, issue evidence, or Git
    history.

## Recovery and rollback

Repository content recovery and Hosted deployment recovery are separate
operations.

For repository content, use ordinary controlled Git/repository history and the
admitted authoring boundaries. Do not rewrite published history merely to hide a
Hosted mutation.

For Hosted runtime recovery:

1. restore intended server-side configuration without exposing values;
2. restore or redeploy a known-good source revision;
3. verify the canonical Hosted origin and OAuth callback still match exactly;
4. verify anonymous authentication gating and allow-listed access;
5. verify persistent state behavior;
6. leave the runtime fail-closed if configuration or persistent state is
   incomplete rather than falling back to weaker authority.

## Lifecycle and decommissioning

Hosted infrastructure is not permanent merely because it once proved the
architecture.

Before retiring a deployment, inventory each concrete dependency and classify
it as:

- `DEDICATED — SAFE TO RETIRE`;
- `SHARED — KEEP`;
- `UNKNOWN — DO NOT DELETE`.

Only proven dedicated resources may be removed. Shared or unknown OAuth apps,
repository credentials, databases, domains, or integrations must be preserved
until ownership is resolved.

Retiring one validation or consumer deployment does not deprecate Hosted Studio,
ADR 0008/0009/0010, the `persistent-redis` topology contract, Redis adapters,
OAuth/session/CSRF semantics, or the ability to provision a new dedicated
Hosted Studio when product need justifies it.

## Issue #275 historical validation record

Issue #275 established the first real private Hosted Studio deployment and
validated the selected Vercel + persistent Redis operating model.

Historical deployment identity:

```text
Vercel project:      atelier-kit-hosted-studio
Canonical origin:    https://atelier-kit-hosted-studio.vercel.app
OAuth callback:      https://atelier-kit-hosted-studio.vercel.app/auth/github/callback
Redis resource:      atelier-kit-hosted-state
Repository:          gcomneno/atelier-kit
Validation branch:   issue-275-hosted-validation
Writable root:       config
Initial mutation:    config/social.yaml
```

The final capability-aware validation deployment used feature revision
`2e7be819a043b89f454ab6ecf9967731a93f8c7f`. The controlled branch began at
`5bf517ea2b3df8b5a23c66ba07abaf4290ab8f16`; one valid Social save advanced
only the validation branch to
`f28a2ea84eba98db34217ce11e019da5b60367e8`, while `main` remained unchanged.

Observed validation evidence included:

- stale revision rejection with no branch advance;
- wrong CSRF and cross-site Origin rejection with no branch advance;
- unknown session rejection and stale-cookie clearing;
- POST logout invalidating server-side authority;
- generic/secret-safe repository failure from an initially under-scoped
  fine-grained PAT;
- session authority surviving a real redeploy, proving persistent state rather
  than dependence on one process;
- not-yet-admitted Studio routes remaining fail-closed;
- current-policy authorization being re-evaluated for an existing authenticated
  session.

These observations remain historical architecture/security evidence. They do
not make the old deployment, branch, OAuth callback, or Redis resource current
runtime authority.

### #359 decommission record

On 2026-09-02 issue #359 reconciled the lifecycle of the #275 validation
infrastructure.

Observed inventory showed:

- `atelier-kit-hosted-studio` still existed as a dedicated Vercel project;
- `atelier-kit-hosted-state` was an owned Upstash for Redis Marketplace
  resource connected only to `atelier-kit-hosted-studio (production)`;
- `issue-275-hosted-validation` was already absent/non-authoritative;
- the canonical local checkout was linked to `atelier-kit-public-demo`, not the
  historical Hosted project.

After classification as dedicated resources:

- `atelier-kit-hosted-state` was disconnected from all projects and deleted;
- subsequent inspection returned no such resource;
- `atelier-kit-hosted-studio` was removed from Vercel;
- subsequent inspection returned no such project;
- the canonical checkout link remained unchanged.

The historical GitHub OAuth application and repository PAT were **not** deleted
because current account-level ownership/reuse was not proven. They remain
`UNKNOWN — DO NOT DELETE` until separately reconciled.

The lifecycle decision is therefore:

```text
Hosted Studio architecture
  KEEP

#275 Atelier-Kit validation infrastructure
  DECOMMISSIONED

Future consumer Hosted Studio
  PROVISION EXPLICITLY WHEN NEEDED
```

## Issue #281 public Visitor deployment validation record

The separately verified public Vercel project is
`giadaware/atelier-kit-visitor-demo`, at
<https://atelier-kit-visitor-demo.vercel.app>. It is a default-content,
read-only Visitor deployment and must never inherit Hosted Studio configuration
or credentials.

The corrected issue #281 live audit on 2026-08-12 verified representative
Visitor pages returned 200 while representative Studio/auth GET routes and
canonical-Origin POSTs remained 404/fail-closed, with neither OAuth redirect nor
`Set-Cookie` response transport on denied routes. The environment-variable
listing visible to the auditing credentials returned no variables.

Run the explicit-project, canonical-Origin audit in [Deploy to
Vercel](deploy-vercel.md) after every relevant Visitor deployment. The security
interpretation is recorded in the
[Hosted Studio threat model](../security/hosted-studio-threat-model.md).
