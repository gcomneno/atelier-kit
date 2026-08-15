# ADR 0008: Hosted Studio architecture

## Status

Accepted.

## Context

ADR 0007 established Atelier Desktop and localhost Studio as the production-safe
authoring model. The public deployment remains read-only and `/studio` returns
404 unless local authoring is explicitly enabled.

Issue #82 revisits hosted authoring for operators who need browser-based access
without a local checkout, Node installation, or Atelier Desktop.

The Hosted application and security foundations described by this ADR now
exist, including explicit runtime separation, the repository boundary and the
Hosted authentication/authorization boundary. Hosted Studio is still not a
fully deployed authoring product: route and mutation enablement remain
deliberately limited and fail closed outside their explicitly implemented
scope.

The current Studio implementation cannot simply be enabled on a hosted Vercel
deployment:

- `guardStudio()` recognizes only Vite development or `ATELIER_STUDIO=1`;
- there is no authentication or session layer;
- Studio writes YAML and uploaded images directly into `process.cwd()`;
- structural validation assumes a project checkout;
- the local publish flow invokes Git and Vercel CLI commands;
- the current production deployment is intentionally read-only.

Hosted Studio therefore requires a distinct persistence and security boundary.
It must not weaken ADR 0007 for ordinary public deployments.

## Decision

Atelier-Kit will support Hosted Studio as a **separate authoring deployment**
using the existing SvelteKit Studio UI, protected by an explicit hosted-authoring
runtime mode and authentication layer.

The public visitor deployment remains read-only.

Conceptually:

```text
Public deployment
    visitor routes
    /studio -> 404

Hosted Studio deployment
    authentication
        |
        v
    /studio UI
        |
        v
    authoring services
        |
        v
    repository adapter
        |
        v
    GitHub repository
        |
        v
    normal deployment pipeline
```

Hosted Studio is therefore a **SvelteKit route architecture on a dedicated
authoring deployment**, not an edge-only middleware solution and not a separate
CMS application.

Authentication may be enforced centrally in SvelteKit hooks or equivalent
server middleware, but middleware alone is not the authoring architecture.

## Runtime modes

Atelier-Kit has four distinct runtime modes. ADR 0011 extends the original
Visitor / Local / Hosted model with an explicitly isolated public Demo runtime.

### Visitor production

Default production mode.

- visitor routes enabled;
- `/studio/**` returns 404;
- no hosted write capability;
- no authoring credentials required.

### Local Studio

Existing ADR 0007 behavior.

- Vite development or explicit local `ATELIER_STUDIO=1`;
- direct filesystem reads and writes;
- local structural validation;
- local Git/Vercel publishing remains available;
- no hosted authentication requirement.

### Hosted Studio

Explicitly configured authoring deployment.

- disabled by default;
- authentication required before Studio content is returned;
- authorization checked for every read/write operation;
- filesystem mutation is not the persistence mechanism;
- repository-backed storage is used;
- local Git and Vercel CLI publishing is unavailable.

The concrete environment variable names are intentionally not fixed by this ADR.
Implementation must expose one unambiguous hosted-authoring switch and must fail
closed when required configuration is absent.

### Public Demo

ADR 0011 introduces `ATELIER_STUDIO_MODE=demo` as a fourth explicit runtime
for the public end-to-end product demonstration tracked by issue #283.

Demo is deliberately distinct from Hosted Studio. It does not inherit GitHub
OAuth identity, the Hosted authorization allow-list, Hosted trusted request
contexts, Hosted sessions or Hosted mutation authority.

The first Demo implementation slice is intentionally inert:

- Demo is a valid runtime classification;
- `/studio/**` remains unavailable;
- existing `/auth/**` routes remain unavailable;
- Hosted mutation guards return their non-authoritative outcome;
- no guest session, repository credential or write capability exists yet.

Later Demo capabilities require their own explicitly admitted server-side
authority boundaries. They must not weaken Visitor, Local or Hosted semantics.

## Persistence model

Git remains the canonical content history.

Process or function memory is never the persistence model for deployment
security state. It can support local development and tests, but process reuse
does not make it durable across scaling, restart or instance changes. ADR 0010
defines the persistent OAuth-transaction and session-state topology required
for a real Hosted Studio deployment.

Hosted Studio will introduce a storage/repository boundary instead of calling
the current filesystem primitives directly.

Conceptual interface:

```text
AuthoringRepository
  read(path, revision)
  write(changeSet, expectedRevision)
  delete(changeSet, expectedRevision)
  readBinary(path, revision)
```

Two adapters are expected:

1. **Local filesystem adapter**
   - preserves existing Local Studio behavior.

2. **GitHub repository adapter**
   - used by Hosted Studio;
   - reads repository content at a known revision;
   - creates atomic commits for related changes;
   - advances only the configured branch;
   - rejects stale writes.

The domain/editorial validation rules remain shared. Storage-specific code must
not duplicate content schemas.

## Repository scope

Hosted Studio operates against one explicitly configured repository and branch
per authoring deployment.

It must not accept arbitrary repository names, owners, branches, paths, or GitHub
hosts from browser input.

Writable namespaces remain constrained to Atelier-managed content:

```text
config/**
content/**
static/images/**
```

The exact allow-list is implementation-owned and must be narrower where
possible.

Source code, workflow files, environment files, `.git/**`, `.vercel/**`,
dependencies, and arbitrary repository paths are never Studio-writable.

## Authentication

Authentication is mandatory in Hosted Studio mode.

This ADR deliberately does not select the provider.

The authentication implementation must provide:

- server-validated identity;
- secure session handling;
- logout and session expiry;
- HttpOnly cookies where cookie sessions are used;
- Secure cookies in production;
- SameSite protection appropriate to the chosen flow;
- session rotation after authentication;
- no authentication secrets exposed to browser JavaScript.

Hosted Studio must fail closed if authentication configuration is incomplete.

## Authorization

Initial Hosted Studio scope is deliberately single-site and small.

A successfully authenticated identity is not automatically authorized.

Authorization must verify that the identity is permitted to operate the specific
configured Studio deployment.

The first implementation does not require a generalized RBAC system, but the
authorization decision must be explicit and centralized so roles can be added
later.

## CSRF and mutation requests

All state-changing Hosted Studio requests require CSRF protection.

At minimum:

- same-origin mutation policy;
- Origin/Host validation;
- framework-appropriate CSRF token or equivalent robust defense;
- no state mutation through GET;
- authentication alone is insufficient protection.

Local Studio behavior must not accidentally bypass Hosted Studio CSRF checks
when hosted mode is active.

## Concurrency

Hosted writes use optimistic concurrency.

Every edit is based on a known repository revision.

A write succeeds only if the configured branch still matches the expected
revision. If another write has advanced it, Studio reports a conflict and reloads
before allowing another save.

Hosted Studio must never silently overwrite a newer repository state.

A logical mutation may contain multiple normalized text writes, binary writes,
and deletions. The complete change set is validated before repository mutation
begins and uses one expected repository revision.

For the GitHub adapter, every non-delete entry is materialized as a Git blob,
the complete set is assembled into one tree, one commit is created with the
expected parent, and the configured branch is advanced exactly once without
force. A failed ref update may leave unreachable Git objects, but the configured
branch remains unchanged and no subset of the logical mutation becomes
branch-visible.

A logical mutation that changes multiple files, such as an item YAML record plus
an uploaded image, therefore produces one repository commit and one resulting
authoring revision.

The Local filesystem adapter preserves the same logical change-set contract but
does not claim a filesystem primitive that can atomically expose several path
replacements at once. It validates and snapshots every participating path before
mutation, applies the complete synchronous change set, and performs compensating
rollback if a filesystem operation fails. Its change-set revision is a
deterministic hash over only the normalized participating paths and their
present/absent content revisions, so unrelated Local project changes do not
create false conflicts. Local multi-path atomicity is therefore a
caller-visible transaction/rollback guarantee, not a claim of OS-level
multi-file atomic replacement.

## Uploads

Hosted uploads never write persistent data to the function filesystem.

The initial controlled image-upload boundary admits exactly one uploaded image
at a time and validates the uploaded bytes before repository mutation authority
is consulted. Browser-provided filenames, extensions and MIME types are
informational only and do not establish format or repository-path authority.

The admitted image contract is deliberately finite:

- JPEG, normalized to the `jpg` extension and `image/jpeg` MIME type;
- PNG;
- WebP;
- maximum encoded size: 5 MiB;
- maximum width: 8192 pixels;
- maximum height: 8192 pixels;
- maximum decoded pixel budget: 40,000,000 pixels.

Server-side validation uses `sharp`/libvips to determine the actual image format
from the bytes, inspect dimensions and force pixel decoding. Unsupported,
empty, malformed, truncated, undecodable or over-limit inputs fail before a
repository mutation begins. SVG and arbitrary remote URL ingestion remain
excluded.

Repository destinations are derived only from branded server-owned image slots.
Each admitted slot fixes its repository directory, public directory, basename,
related text/YAML path and commit message. Browser input cannot select or mint
repository, branch, writable root, destination directory, basename, related
document path or commit message authority.

The current reusable slot boundary covers the site header logo, favicon, hero
banner and site background under `static/images/site`, with corresponding public
paths under `/images/site`. A slot may resolve only the admitted `jpg`, `png`
or `webp` extension.

Create, replacement and removal are complete logical mutations:

- create writes the related text/YAML state and the validated binary;
- replacement writes the related text/YAML state and new binary and deletes the
  prior admitted slot asset when its canonical path changes;
- removal updates the related text/YAML state and deletes the prior admitted
  slot asset.

All participating writes and deletes are normalized before mutation and are
submitted through one `AuthoringRepository.applyChanges()` call with one
expected revision and one server-owned commit message. A successful mutation
therefore produces one resulting repository revision. Validation failure, stale
revision or ref-conflict failure must not expose a branch-visible partial image
and metadata state.

Temporary runtime storage, if used, is scratch space only.

## Validation

The existing Atelier content contract remains authoritative.

Hosted Studio must run equivalent structural and Atelier Mark validation before a
repository commit is accepted.

Validation code should be extracted into reusable in-process services where
required rather than depending on spawning checkout-specific CLI commands.

The hosted implementation must not commit an invalid intermediate repository
state.

## Publishing

Hosted Studio does not execute the Local Studio publish implementation.

Specifically it must not:

- invoke local `git`;
- invoke Vercel CLI;
- depend on `.vercel/project.json`;
- assume a mutable checkout.

A successful Hosted Studio save creates a repository commit.

Deployment is then performed by the configured repository-to-host deployment
pipeline.

A later explicit Publish action may coordinate or report deployment state, but
it must use a hosted-safe provider/API boundary rather than invoking local CLI
commands.

## Audit

Git history is the first durable audit record.

Hosted commits must carry sufficient stable metadata to identify:

- that the mutation originated from Hosted Studio;
- the authenticated operator identity where safe and appropriate;
- the logical operation being performed.

Application security events such as failed authentication attempts or rejected
authorization decisions are not adequately represented by Git history and may
require a separate operational log.

## Public deployment isolation

ADR 0007 remains valid.

A normal production deployment:

- does not set Hosted Studio configuration;
- keeps `/studio/**` unavailable;
- contains no usable authoring credential;
- cannot be turned into an authoring surface by browser input.

Hosted authoring should preferably use a distinct hostname and deployment
configuration from the public visitor site.

## Security boundary

The authoritative security boundary is server-side:

```text
request
  -> hosted mode check
  -> authentication
  -> authorization
  -> CSRF/origin checks for mutations
  -> input/content validation
  -> repository path allow-list
  -> optimistic concurrency check
  -> atomic repository commit
```

UI visibility is never considered an authorization control.

## Consequences

### Positive

- preserves the file/Git content model;
- public deployments remain read-only;
- operators can edit remotely from a browser;
- existing Studio UX and content rules can largely be reused;
- repository commits provide revision history and rollback;
- no CMS database is introduced.

### Negative

- introduces authentication and session operations;
- introduces GitHub API/repository credentials;
- Studio server code must be separated from local filesystem assumptions;
- conflict handling becomes a user-visible concern;
- hosted upload and abuse controls are required;
- operational responsibility is higher than Desktop/local Studio.

## Alternatives rejected

### Enable `ATELIER_STUDIO=1` on the public Vercel deployment

Rejected.

It would expose Studio without solving persistent writes, authentication,
authorization, CSRF, concurrency, upload safety, or publish semantics.

### Keep direct filesystem writes in hosted functions

Rejected.

The hosted runtime filesystem is not the canonical durable content store.

### Build a separate SaaS CMS

Rejected for this phase.

It would duplicate Atelier content concepts and unnecessarily introduce a
database, tenancy model, and broader operations platform.

### Edge middleware as the architecture

Rejected.

Middleware can participate in authentication or routing but does not solve
repository persistence, validation, uploads, concurrency, or publication.

## Implementation sequence

1. threat model and security checklist;
2. extract runtime mode and authoring authorization boundary;
3. define repository/storage interface;
4. preserve existing filesystem adapter;
5. implement GitHub adapter against a private test repository;
6. select and implement one authentication provider;
7. introduce authenticated Hosted Studio route gating;
8. add optimistic concurrency and atomic write tests;
9. add hosted-safe upload path;
10. private deployment proof of concept;
11. security review;
12. operator documentation;
13. only then consider consumer rollout.

## Compatibility

- Local Studio remains supported.
- Atelier Desktop remains supported.
- Public deployments remain unchanged by default.
- Existing client repositories require no content migration.
- Hosted Studio is opt-in.

## Related decisions

- ADR 0002 — Local Studio research.
- ADR 0007 — Production-safe Studio authoring / Atelier Desktop.
- ADR 0009 — Hosted Studio authentication and authorization boundary.
- ADR 0010 — Hosted Studio persistent state.
- Issue #82 — Hosted Studio with authentication.
- Issue #275 — first private Hosted Studio deployment.
