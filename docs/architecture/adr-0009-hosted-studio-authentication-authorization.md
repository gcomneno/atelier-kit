# ADR 0009: Hosted Studio authentication and authorization boundary

## Status

Accepted.

## Context

ADR 0008 defines Hosted Studio as a separate authoring deployment with explicit
authentication, authorization, session, CSRF/origin, repository and deployment
isolation boundaries.

The runtime-mode boundary, AuthoringRepository abstraction and GitHub-backed
authoring adapter now exist, but Hosted Studio remains intentionally fail-closed
and inaccessible.

Before any Hosted Studio route can be enabled, Atelier-Kit needs one precise
authentication and authorization contract that preserves these properties:

- visitor production remains read-only and exposes no usable Studio surface;
- Local Studio keeps its existing ADR 0007 behavior;
- authentication does not imply authorization;
- browser state is never authorization authority;
- provider and repository credentials remain server-only;
- Hosted Studio mutations require session, authorization, origin and CSRF
  validation before repository mutation begins.

This ADR resolves issue #257. It does not enable Hosted Studio.

## Decision

Atelier-Kit Hosted Studio will use:

1. a dedicated authoring deployment and hostname;
2. a GitHub App OAuth web flow as the initial authentication provider;
3. a stable GitHub numeric user ID as the canonical provider subject;
4. a centralized server-side allow-list authorization policy;
5. an opaque server-side session identified by a secure cookie;
6. centralized route gating for Hosted Studio and authentication endpoints;
7. exact canonical Host/Origin validation plus a synchronizer CSRF token for
   mutations.

JWT is not part of the initial session architecture.

## Deployment topology

The initial Hosted Studio topology consists of two separate deployments:

```text
Public visitor deployment
  -> visitor runtime
  -> read-only content
  -> /studio/** = 404
  -> /auth/** = 404
  -> no Hosted Studio authentication secrets
  -> no Hosted Studio repository credentials

Hosted authoring deployment
  -> hosted runtime
  -> dedicated canonical HTTPS origin
  -> GitHub App authentication
  -> server-side sessions
  -> centralized authorization
  -> GitHub-backed AuthoringRepository
```

The authoring deployment should use a dedicated hostname.

The public deployment must not receive Hosted Studio authentication,
session-store or repository credentials.

## Authentication provider

The initial authentication provider is a GitHub App using the OAuth web
application flow.

The GitHub App is selected because the Hosted Studio authoring architecture is
already GitHub-backed and because GitHub Apps provide an identity flow while
allowing repository authority to remain separately controlled by the server.

Authentication proves operator identity only.

The user access token involved in the OAuth flow is not the persistent
repository-authoring credential and must not become browser-visible session
state.

Repository mutation authority remains independently server-controlled.

Atelier-Kit will support exactly one authentication provider in the initial
Hosted Studio implementation.

## Identity contract

Authentication produces an `AuthenticatedIdentity`.

Its minimal logical contract is:

```text
AuthenticatedIdentity
  provider = "github"
  subject
  login
  displayName?
  avatarUrl?
```

`subject` is the stable GitHub numeric user ID represented in a canonical
server-side form.

Only `provider` and `subject` participate in the initial authorization
decision.

`login`, `displayName` and `avatarUrl` are informational. They never grant
authority.

Email addresses are not authorization identifiers.

## Authorization contract

Authentication and authorization are distinct states.

The initial authorization policy is deliberately small:

```text
AuthenticatedIdentity
  -> provider is GitHub?
  -> stable subject is authorized for this deployment?
       no  -> deny
       yes -> AuthorizedHostedIdentity
```

The allow-list is server-controlled and deployment-specific.

The initial implementation does not introduce generalized RBAC, teams,
multi-tenancy or per-page permissions.

The authorization boundary must be centralized and must produce a trusted
server-side `AuthorizedHostedIdentity` or equivalent authorization context.

Route loaders and mutation handlers must never infer authorization from:

- browser fields;
- cookies other than the validated session identifier;
- query parameters;
- hidden form fields;
- display names;
- GitHub login names;
- UI visibility.

### Bootstrap authorization

An installation may use a configured GitHub login as an explicit bootstrap
identifier so an operator does not need to discover and type a numeric GitHub
user ID manually.

The bootstrap login is not permanent authorization authority.

During the verified GitHub authentication flow, Atelier-Kit resolves the
bootstrap account to its stable numeric GitHub user ID. Subsequent
authorization uses the stable subject.

Installing the GitHub App does not automatically authorize an operator to use
Hosted Studio.

## Session model

Hosted Studio uses opaque server-side sessions.

The browser receives only a cryptographically random session identifier in a
cookie. Identity, authorization state, provider tokens and repository
credentials are not encoded into browser-readable session state.

The logical session record contains at least:

```text
HostedSession
  sessionId
  identity.provider
  identity.subject
  authorization state
  createdAt
  rotatedAt
  expiresAt
  lastSeenAt
```

The initial session policy is:

- absolute lifetime: 8 hours;
- idle timeout: 2 hours;
- rotation immediately after successful authentication;
- periodic rotation during an active session, with an implementation target
  between 30 and 60 minutes;
- logout invalidates the server-side session and clears the browser cookie;
- malformed, unknown or expired sessions fail closed;
- an expired or malformed browser session is cleared and the operator is sent
  through authentication again rather than receiving internal diagnostics.

The session store is an explicit server-side boundary.

An in-memory implementation may be used for tests or local development, but a
Hosted Studio deployment requires a persistence model appropriate to its
runtime topology.

The initial design does not require Redis or a specific database.

## Session cookie

The Hosted Studio session cookie must be:

- HttpOnly;
- Secure in production;
- SameSite=Lax;
- scoped only as broadly as required by Hosted Studio;
- opaque;
- independent from GitHub provider tokens.

Cookie contents must not contain identity attributes, authorization claims,
GitHub tokens or repository credentials.

## Route gating

Hosted Studio route gating is centralized server-side.

The required behavior is:

| Runtime | Session | Authorized | `/studio/**` |
| --- | --- | --- | --- |
| visitor | any | any | 404 |
| local | n/a | n/a | existing Local Studio behavior |
| hosted | absent/expired | n/a | redirect to authentication |
| hosted | valid | no | 403 |
| hosted | valid | yes | allow |

Authentication endpoints live outside the Studio route tree:

```text
GET  /auth/github/login
GET  /auth/github/callback
POST /auth/logout
```

`/auth/**` returns 404 in visitor and local modes.

In Hosted mode:

- `/auth/github/login` begins authentication;
- `/auth/github/callback` validates the OAuth response and establishes an
  authorized session only after the authorization policy succeeds;
- `/auth/logout` invalidates the session and requires mutation protections.

Authentication return targets must be validated local paths below `/studio`.
External or scheme-relative return targets are rejected.

A successful Hosted route guard creates trusted server-side authorization
context, for example through SvelteKit `event.locals`.

Mutation handlers must consume or repeat that trusted authorization check.
Successful parent-layout rendering is not itself mutation authorization.

## OAuth request integrity

The GitHub OAuth flow uses cryptographically random request state.

The callback must validate that state before establishing identity or session
state.

OAuth callback validation is separate from the ordinary Studio synchronizer
CSRF token because the callback occurs before a Hosted Studio session is
established.

Provider failures must fail closed and must not expose provider tokens,
authorization codes or provider responses to the browser or logs.

## CSRF and canonical-origin contract

Hosted Studio has one canonical HTTPS origin configured server-side.

Conceptually:

```text
ATELIER_STUDIO_CANONICAL_ORIGIN=https://studio.example.com
```

The expected Host and Origin are derived from this trusted configuration, never
from request headers.

For Hosted Studio mutations:

1. runtime must be hosted;
2. session must be valid;
3. identity must be authorized;
4. request Host must match the configured canonical host;
5. request Origin must exactly match the configured canonical origin;
6. the HTTP method must be state-changing and explicitly supported;
7. the synchronizer CSRF token must be valid;
8. only then may input/content/repository validation begin.

Missing or malformed Origin on a browser mutation fails closed.

No wildcard origins or implicit subdomain trust are allowed.

SameSite=Lax is defense in depth and is not the primary CSRF control.

## CSRF token

Each authenticated Hosted Studio session has an independent cryptographically
random synchronizer CSRF token.

The token:

- is not the session identifier;
- is not derived trivially from the session identifier;
- is validated server-side;
- may be transported in a hidden form field or an explicitly supported request
  header;
- is compared using an implementation appropriate for secret values;
- is never written to logs.

`POST /auth/logout` requires the same mutation protections.

The OAuth callback is exempt from the Studio synchronizer token only because it
uses OAuth state before the Studio session exists.

## HTTP mutation policy

GET, HEAD and OPTIONS never perform Hosted Studio state changes.

Hosted mutations use only explicitly supported state-changing methods such as
POST, PUT, PATCH or DELETE.

Unexpected methods fail closed.

Typical denial semantics are:

```text
wrong Host       -> 403
wrong Origin     -> 403
missing Origin   -> 403
missing CSRF     -> 403
invalid CSRF     -> 403
unsupported verb -> 405
```

Browser-facing denial responses should not disclose security internals.

## Configuration and secrets

Hosted authentication configuration is server-only and must be validated
fail-closed.

The concrete implementation may refine names, but the configuration boundary
must cover at least:

- Hosted runtime enablement;
- canonical authoring origin;
- GitHub App OAuth identity configuration;
- authorization bootstrap/allow-list configuration;
- session-store configuration and secrets;
- GitHub repository-authoring credentials.

Secrets include at least provider client secrets, provider/user access tokens,
session-store credentials and repository-authoring credentials.

Secrets must never be serialized into:

- page data;
- client bundles;
- browser-readable storage;
- Git history;
- application error responses;
- ordinary application logs.

## Deployment secret matrix

| Capability/configuration | Visitor production | Local Studio | Hosted Studio |
| --- | --- | --- | --- |
| Hosted runtime configuration | no | no | yes |
| Canonical authoring origin | no | no | yes |
| GitHub App auth configuration | no | no | yes |
| Hosted authorization policy | no | no | yes |
| Hosted session-store secrets | no | no | yes |
| Hosted repository credentials | no | no | yes |
| Local filesystem authoring | no | yes | no |

Incomplete or inconsistent Hosted authentication configuration must make Hosted
Studio unavailable rather than falling back to Local Studio or visitor
behavior with write authority.

## Security events

Security events not represented adequately by Git commit history should be
recorded server-side where operational logging is available.

Initial events include:

- failed authentication;
- invalid OAuth state;
- rejected authorization;
- invalid or expired session where operationally useful;
- logout/session invalidation where operationally useful;
- Host/Origin/CSRF rejection where operationally useful.

Logs must not contain:

- provider access tokens;
- OAuth authorization codes;
- session cookies;
- complete session identifiers;
- CSRF tokens;
- Authorization headers;
- raw provider responses containing secrets.

## Repository authority separation

Operator identity and repository mutation authority are intentionally separate.

```text
operator
  -> GitHub App OAuth
  -> authenticated identity
  -> Atelier-Kit authorization
  -> Hosted session

Hosted Studio server
  -> server-controlled GitHub App/repository credential
  -> GitHubAuthoringRepository
  -> configured repository and branch
```

A successful operator login must not grant arbitrary GitHub repository
authority.

The repository and branch remain fixed server-side as defined by ADR 0008 and
the GitHub AuthoringRepository adapter.

## Security sequence

The Hosted Studio request boundary remains:

```text
request
  -> hosted mode check
  -> authentication/session validation
  -> authorization
  -> Host/Origin/CSRF checks for mutations
  -> input/content validation
  -> repository path allow-list
  -> optimistic concurrency
  -> atomic repository commit
```

No later layer may compensate for skipping an earlier security boundary.

## Non-goals

This ADR does not:

- enable Hosted Studio routes;
- wire GitHubAuthoringRepository into live Studio mutations;
- implement hosted uploads;
- implement multi-file authoring orchestration;
- implement hosted publishing;
- introduce generalized RBAC;
- introduce multiple authentication providers;
- change Local Studio authentication requirements;
- make the public deployment writable.

## Consequences

### Positive

- authentication and repository authority remain separated;
- authorization is based on a stable provider identifier;
- sessions support immediate server-side invalidation;
- no JWT revocation machinery is required;
- visitor production remains isolated from authoring credentials;
- CSRF and canonical-origin requirements are explicit before writes are enabled;
- the initial model remains suitable for a single-site/small-team deployment.

### Negative

- Hosted Studio requires server-side session persistence;
- GitHub becomes an external identity dependency for the initial provider;
- session lifecycle and OAuth operations add operational state;
- a dedicated authoring deployment requires separate configuration and secrets;
- future multi-provider or RBAC requirements will require additional design.

## Alternatives rejected

### JWT as the initial Hosted Studio session

Rejected for the initial implementation.

A self-contained JWT would add signing, claim validation, rotation and revocation
concerns without providing a meaningful advantage for the small Hosted Studio
deployment.

Opaque server-side sessions provide simpler immediate logout and revocation
semantics.

### GitHub username or email as permanent authorization identity

Rejected because display identifiers can change and should not become implicit
authority.

Authorization uses the stable GitHub numeric user ID.

### Authentication implies authorization

Rejected.

A valid GitHub identity proves who the operator is, not whether that identity
may administer the configured Atelier-Kit deployment.

### GitHub App installation implies Studio authorization

Rejected.

Repository installation and human authoring authorization are separate powers.

### Browser-managed bearer token

Rejected.

Provider tokens and repository credentials remain server-only and are not
stored in localStorage, sessionStorage or browser-readable cookies.

## Implementation sequence

Follow-up implementation should be split into small verticals:

1. canonical Hosted identity and authorization policy;
2. server-side session-store abstraction and lifecycle;
3. GitHub App OAuth provider integration;
4. centralized Hosted route gating and trusted request context;
5. canonical Host/Origin and synchronizer CSRF protection;
6. security-event logging and secret-redaction tests;
7. private Hosted Studio read-only route PoC;
8. only after the security gate passes, connect controlled repository-backed
   mutations.

No implementation issue should enable Hosted Studio writes before steps 1-6 are
complete and verified.

## Compatibility

- Visitor production remains read-only.
- `/studio/**` remains 404 in visitor mode.
- `/auth/**` remains 404 outside Hosted mode.
- Local Studio remains usable without Hosted authentication credentials.
- Hosted Studio remains opt-in and fail-closed.

## Related decisions

- ADR 0007 — Local Studio boundary and localhost safety.
- ADR 0008 — Hosted Studio architecture.
- Hosted Studio threat model.
- Issue #82 — Hosted Studio.
- Issue #257 — Hosted Studio authentication and authorization boundary.
- Issue #251 — runtime/security modes.
- Issue #253 — AuthoringRepository boundary.
- Issue #255 — GitHub AuthoringRepository adapter.
