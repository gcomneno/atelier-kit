# Hosted Studio threat model

Status: Draft security model for issue #82, refined for the first private
Hosted Studio deployment in issue #275.

This document applies only to the Hosted Studio runtime defined by ADR 0008.
Local Studio continues to follow ADR 0007.

For the first private deployment's operating procedure and recorded validation
evidence, see the [Private Hosted Studio operator runbook](../usage/hosted-studio.md).

## Assets

Protected assets include:

- editorial YAML and image content;
- repository history and configured authoring branch;
- GitHub repository credentials;
- authentication/session credentials;
- deployment integrity;
- operator identity;
- unpublished or draft editorial information.

## Trust boundaries

```text
Operator browser
    |
    | untrusted HTTP input
    v
Hosted Studio deployment
    |                                |
    | transient security/session      | authenticated/authorized
    | state only                      | repository operations
    v                                v
Persistent state store           GitHub
                                     |
                                     | repository-triggered deployment
                                     v
                                 Public site
```

The browser is never trusted merely because it rendered Studio UI.

GitHub and the configured identity provider are external security dependencies.
The persistent state store is a separate server-side trust boundary. It stores
only transient OAuth and session security state; GitHub remains the canonical
editorial history and repository-authority boundary. ADR 0010 defines this
boundary for the deployment-capable topology.

## Primary threats and controls

### Unauthenticated Studio access

Threat:
an internet visitor accesses Studio routes or mutation endpoints.

Controls:

- Hosted Studio disabled by default;
- authentication required before serving Studio data;
- server-side guard on the whole Studio route tree;
- mutation handlers repeat or consume centralized authorization context;
- public deployments continue returning 404.

### Broken authorization

Threat:
an authenticated account writes a site it is not permitted to manage.

Controls:

- explicit identity allow-list or equivalent authorization policy;
- deployment fixed to one configured repository/site initially;
- repository/branch never selected from browser input;
- centralized authorization decision.

### CSRF

Threat:
a logged-in operator is tricked into submitting a Studio mutation.

Controls:

- same-origin policy;
- Origin and Host validation;
- CSRF token or equivalent robust framework defense;
- SameSite session cookie;
- mutations only through non-GET requests.

### Session theft or fixation

Controls:

- HttpOnly session cookies;
- Secure cookies in production;
- session rotation at authentication;
- bounded session lifetime;
- logout invalidation;
- secrets never serialized into page data or client bundles.

### Persistent-state isolation, integrity and availability

Threats:

- a shared store key collides across deployments or environments;
- a stored serialized record is malformed, tampered with, or incompatible with
  the expected schema/version;
- Redis TTL cleanup disagrees with application expiry timestamps;
- concurrent requests race while touching, updating, invalidating or rotating
  a session;
- a stale session is resurrected after expiry, invalidation or rotation;
- non-atomic session-ID rotation leaves both old and new identifiers usable;
- an OAuth transaction is replayed;
- the state store is unavailable, slow or times out;
- Redis credentials leak into browser-visible data or ordinary logs;
- an implementation falls back to process memory and fails open during a store
  error.

Controls:

- deployment-unique, versioned key namespaces isolate every deployment and
  environment;
- only server-side configuration may provide Redis credentials, and those
  credentials are excluded from client bundles, page data, errors and ordinary
  logs;
- stored values are treated as untrusted input and are schema-validated on
  every read; malformed, unknown, expired or incompatible records fail closed;
- application timestamps and lifecycle validation are authoritative for
  absolute and idle expiry; Redis TTL is cleanup and availability support only;
- OAuth state is collision-safe at creation, bounded by TTL and atomically
  consumed once before callback processing continues;
- session creation is collision-safe and bounded by absolute TTL;
- touch/update and rotation use atomic, preconditioned server-side operations
  so stale state cannot overwrite, revive or outlive a newer lifecycle state;
- rotation atomically retires the old session ID while establishing the new
  session ID;
- delete/invalidation is idempotent;
- store errors, timeouts and failed configuration deny the request and never
  fall back to memory, browser state or JWTs.

### Repository credential theft

Controls:

- server-only credentials;
- minimum repository permissions;
- credential scoped to the configured repository where possible;
- no credential in YAML, Git history, logs, browser output, or public deployment;
- rotation procedure documented.

### Arbitrary repository writes / path traversal

Controls:

- canonical repository path validation;
- fixed allow-listed namespaces;
- reject absolute paths, `..`, encoded traversal and separator tricks;
- browser never supplies repository owner/repo/branch;
- no write access to workflows, source code, environment or Vercel metadata.

### Lost updates

Threat:
two sessions edit from the same old revision and the later save overwrites the
first.

Controls:

- expected revision on every mutation;
- compare current branch head before commit;
- reject stale changes;
- explicit conflict UI;
- no automatic force update.

### Partial multi-file mutation

Threat:
YAML changes but associated image does not, or vice versa.

Controls:

- normalize and validate the complete proposed change set before mutation;
- reject duplicate/conflicting normalized paths before repository mutation;
- use one expected revision for the whole logical mutation;
- build one repository tree/change-set;
- create one commit containing the complete logical mutation;
- advance the configured branch exactly once and never force-update it;
- treat a ref race as an optimistic-concurrency conflict with the branch
  unchanged, even if unreachable Git objects were already created;
- keep Local filesystem semantics explicit as synchronous
  transaction/rollback rather than claiming OS-level multi-file atomicity.

### Malicious uploads

Threats:

- oversized files;
- disguised or malformed file types;
- truncated or otherwise undecodable images;
- decompression/resource-exhaustion payloads;
- parser/browser payloads;
- storage abuse;
- browser-controlled filename or path manipulation.

Controls:

- admit only JPEG, PNG and WebP for the initial Hosted image boundary;
- reject empty inputs and encoded payloads larger than 5 MiB;
- determine format from uploaded bytes rather than trusting browser filename,
  extension or MIME metadata;
- use `sharp`/libvips metadata inspection and forced pixel decoding so a
  plausible header alone cannot establish admission;
- reject images wider or taller than 8192 pixels;
- reject decoded images above the 40,000,000-pixel budget;
- reject malformed, truncated, unsupported or undecodable image data before
  repository mutation;
- configure image parsing for one page and bounded input pixels;
- derive destination directory, basename, extension, related document path and
  commit message only from branded server-owned image slots;
- treat uploaded original filenames as non-authoritative and never as repository
  paths;
- normalize every derived repository path through the authoring path boundary;
- use one normalized `applyChanges()` change set and one expected revision for
  related metadata plus binary writes/deletes;
- replacement deletes only a canonical prior path belonging to the same admitted
  server-owned slot;
- validation, stale-revision and ref-conflict failure must expose no partial
  branch-visible metadata/image state;
- no arbitrary remote fetch;
- SVG excluded initially;
- deployment content security remains independent.

### SSRF

Threat:
Studio is induced to fetch attacker-selected URLs from the server.

Controls:

- initial Hosted Studio does not support URL-based image import;
- provider calls use fixed API hosts;
- redirects and hosts must be constrained if remote fetch is added later.

### GitHub API abuse

Controls:

- bounded mutation sizes and file counts;
- retry policy that never turns conflicts into force writes;
- rate-limit handling;
- no general-purpose proxy endpoint;
- fixed repository configuration.

### Commit injection / misleading history

Controls:

- server-owned commit message format;
- sanitize operator-controlled text before including it in metadata;
- do not execute commit content in a shell;
- stable Hosted Studio marker in commit metadata/message.

### Validation bypass

Controls:

- validation is server-side;
- browser validation is only UX;
- repository commit occurs only after complete content validation;
- direct adapter APIs are not exposed to the browser.

### Secret leakage through errors

Controls:

- safe operator error messages;
- detailed provider failures restricted to server logs;
- redact tokens, cookies, authorization headers and provider responses;
- never echo environment configuration.

### Denial of service / resource exhaustion

Controls:

- request-size bounds;
- upload-size bounds;
- authentication before expensive operations where practical;
- rate limiting considered before public rollout;
- bounded GitHub API operations;
- no unbounded child-process execution in Hosted Studio.

### Public deployment accidentally becomes writable

Controls:

- visitor production and Hosted Studio are explicit separate runtime modes;
- hosted credentials exist only in the authoring deployment;
- startup/config validation fails closed;
- automated tests assert `/studio` remains unavailable in ordinary production.

### Issue #281 public Visitor production audit

The separately verified public Vercel project is
`giadaware/atelier-kit-visitor-demo`, at
<https://atelier-kit-visitor-demo.vercel.app>. It is a separate default Visitor
demo/showcase, not a Hosted Studio deployment. The repeatable audit names this
project explicitly and does not depend on an ignored local `.vercel` link.

The corrected live audit was rerun successfully on 2026-08-12 against the
dedicated public Visitor deployment. It confirmed the default Atelier-Kit demo
identity and the expected fail-closed boundary:

| Request | Outcome | Boundary evidence |
| --- | --- | --- |
| `GET /`, `/about`, `/catalog`, `/collections`, `/news`, `/faq` | 200 | Default `Atelier-Kit Demo` content renders on navigable public routes. |
| `GET /studio` | 404 | No Studio root. |
| `GET /studio/site/social` | 404 | Nested Studio route fails closed. |
| `GET /auth/github/login` | 404, no redirect | GitHub OAuth cannot start. |
| `GET /auth/github/callback` | 404 | OAuth callback cannot create a session. |
| `POST /auth/logout` with canonical Origin | 404 | No session/logout surface exists in Visitor runtime. |
| `POST /studio/site/social` with canonical Origin | 404 | The admitted Hosted mutation is unavailable; repository-backed mutation cannot begin. |

An environment-variable listing from that audit is limited evidence: it can
show variables visible to the auditing credentials, but cannot prove the
absence of unrelated Vercel project settings, integrations, source
connections, or runtime defaults. No environment values, session values, or
other secrets were recorded.

This is evidence for the Visitor boundary only; it does not grant or test
Hosted authority. Repeat the assertion-based audit after any public-project
environment or runtime change. The exact procedure in [Deploy to
Vercel](../usage/deploy-vercel.md) checks the public title/default content,
all listed denied routes plus canonical-Origin `POST /studio/site/social`, and
the absence of `Location` or `Set-Cookie` headers on denied responses.

## Security invariants

These invariants must have automated coverage before private PoC approval:

1. ordinary production returns no usable Studio surface;
2. Hosted Studio without a valid session cannot read Studio content;
3. authenticated but unauthorized identities cannot read or mutate;
4. GET requests cannot mutate;
5. stale revisions cannot overwrite current branch state;
6. paths outside the allow-list cannot be read or written through authoring APIs;
7. one logical multi-file mutation produces one repository revision;
8. invalid content never advances the branch;
9. repository/auth secrets never enter browser-visible data;
10. Local Studio remains functional without Hosted Studio credentials;
11. persistent-state records are namespace-isolated, schema-validated and fail
    closed when malformed or expired;
12. OAuth state is one-time and session lifecycle operations cannot resurrect a
    stale, invalidated, expired or rotated session;
13. persistent-state outages and partial configuration do not enable a memory,
    browser or JWT fallback.

## Private PoC gate

The private deployment may begin only after:

- auth provider selected and documented;
- repository credentials scoped;
- all security invariants above have tests;
- persistent-state contract tests and outage/concurrency invariants are green;
- CSRF/session configuration reviewed;
- upload path reviewed;
- Hosted Studio is isolated from the public production deployment.

Public or client-facing rollout requires a separate security review.


## Authentication and session controls selected by ADR 0009

ADR 0009 resolves the initial Hosted Studio authentication and authorization
design.

The initial provider is a GitHub App using the OAuth web application flow.
Provider authentication establishes an `AuthenticatedIdentity`; it does not
grant Studio authority by itself.

Authorization uses the stable GitHub numeric user ID as the canonical provider
subject. GitHub login names, display names, avatar URLs and email addresses are
informational and do not grant authority.

The initial authorization policy is a centralized server-side allow-list for
the configured authoring deployment. A configured login may be used only to
bootstrap resolution of the stable numeric subject; GitHub App installation
does not automatically authorize a human operator.

Hosted Studio uses opaque server-side sessions rather than JWT bearer sessions.
The browser receives only a cryptographically random session identifier in an
HttpOnly cookie. Production cookies are Secure and use SameSite=Lax.

The initial session policy has:

- an 8-hour absolute lifetime;
- a 2-hour idle timeout;
- rotation immediately after successful authentication;
- periodic rotation during active use;
- server-side invalidation on logout;
- fail-closed handling for unknown, malformed or expired sessions.

The OAuth callback validates cryptographically random OAuth state before a
session is established.

Hosted Studio mutations additionally require:

- the configured canonical Host;
- exact match against the configured canonical HTTPS Origin;
- an explicitly supported state-changing HTTP method;
- a valid synchronizer CSRF token associated with the authenticated session.

SameSite cookies are defense in depth and do not replace the synchronizer token
or canonical-origin validation.

The OAuth callback is exempt from the ordinary Studio synchronizer token only
because it occurs before the Studio session exists and is protected by OAuth
state.

Operator identity and repository authority remain separate. A GitHub user
access token obtained for authentication is not the persistent
GitHubAuthoringRepository credential.

Visitor production receives no Hosted authentication, session-store or
repository credentials. Both `/studio/**` and `/auth/**` remain unavailable in
visitor mode.

These controls refine the existing threats and invariants in this document;
they do not enable Hosted Studio routes or mutations.

ADR 0010 further governs the persistent state boundary selected for issue
#275. It does not expand the Hosted route allow-list or repository mutation
scope.
