# ADR 0010: Hosted Studio persistent state

## Status

Accepted.

## Context

ADR 0008 defines Hosted Studio as a separate authoring deployment, while ADR
0009 defines GitHub OAuth, opaque server-side sessions, centralized
authorization, exact Host/Origin validation, synchronizer CSRF and the
separation between operator identity and repository mutation authority.

The current issue #271 private Hosted Studio implementation uses
`InMemoryHostedSessionStore` and `InMemoryHostedOAuthTransactionStore` under a
`single-process` topology. That is suitable for tests and local/private PoC
work, but it is not persistence for a deployed authoring service. A Vercel
function process may be reused and may serve concurrent requests, but instances
can also scale, restart and change. Process memory therefore cannot be the
authority for deployed OAuth transactions or sessions.

Issue #275 is the first real private Hosted Studio deployment under parent epic
#82. It needs a deployment-capable state topology without changing the existing
Hosted route allow-list or broadening editorial authority.

## Decision

The first real Hosted Studio topology is a dedicated Vercel authoring
deployment with persistent Redis state. Upstash Redis is the initial deployment
adapter/provider because its HTTP/REST interface is suitable for the serverless
authoring runtime and supports the required atomic state operations.

GitHub remains the canonical editorial history. Redis stores only transient
security and session state: OAuth transactions, opaque session lifecycle data,
and associated server-side CSRF state where applicable. Redis is never an
editorial-content store, repository authority, publishing authority or a source
of browser authorization claims.

### State topology contract

The application owns this configuration contract:

```text
ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY=persistent-redis
ATELIER_STUDIO_STATE_REDIS_REST_URL=<server-only>
ATELIER_STUDIO_STATE_REDIS_REST_TOKEN=<server-only>
ATELIER_STUDIO_STATE_NAMESPACE=<deployment-unique namespace>
```

The allowed topology values are:

| Value | Meaning |
| --- | --- |
| `single-process` | In-memory state for tests, local development and the private test/local PoC only. It is not deployment-safe. |
| `persistent-redis` | Deployment-capable persistent state for Hosted Studio. |

For `persistent-redis`, all three Redis values must be present, non-empty and
valid for the configured adapter. The namespace must be unique to one
deployment/environment; it must not be reused by another authoring deployment,
visitor deployment, test environment or project. Partial, mismatched, unknown
or invalid topology configuration fails closed before Hosted security state is
used.

`single-process` must not silently accept Redis configuration as an alternate
state source, and `persistent-redis` must not fall back to process memory.
Topology selection is explicit. A deployed Hosted authoring runtime with a
missing, partial or unusable persistent-state configuration is unavailable; it
does not become a `single-process` deployment.

For `single-process`, supplying any subset of the persistent Redis settings is
a mismatched configuration and also fails closed. Tests and local/private PoC
work must choose their in-memory topology explicitly.

Redis URL and token values are server-only secrets. Visitor production receives
none of these values or any Hosted authentication, session-store or repository
credentials. Local Studio does not require them.

### Async store boundary

Remote persistence cannot be hidden behind the current synchronous store
interfaces. Deployment-capable Hosted state store contracts are asynchronous.
The in-memory adapters should become async-compatible implementations of the
same contracts rather than preserving divergent synchronous production and
application paths.

Async propagation is required through the security lifecycle, including:

- `HostedGitHubOAuthProvider.begin` and `.complete` as required;
- `HostedSessionLifecycle`;
- `HostedRouteGate`;
- `HostedPrivatePocRuntime`;
- Hosted HTTP, authentication and logout seams; and
- SvelteKit hooks and authentication route handlers.

`HostedMutationGuard` remains logically independent of persistence and may
remain synchronous. The Hosted Social repository read/write path is already
asynchronous and must not gain additional authority from the state store.

### OAuth transaction semantics

OAuth state is a single-use server-side transaction, not browser authority.
Creation must use a cryptographically random identifier and collision-safe
create-with-TTL semantics. The record must contain only the validated,
minimum transaction data needed to complete the flow, such as its creation and
expiry timestamps and a validated local return target.

Callback processing must atomically consume the transaction exactly once before
it can establish identity or a session. A missing, expired, malformed or
already-consumed transaction fails closed. The operation must remain one-time
under concurrent callbacks and must not expose state, authorization codes,
provider tokens or provider responses to browser-visible output or ordinary
logs.

### Session semantics

Sessions remain opaque, server-side records as defined by ADR 0009. A browser
holds only the random session identifier in its protected cookie; repository
credentials and provider tokens are not session-cookie contents or
browser-visible session data.

The persistent store must provide these lifecycle properties:

- session creation is collision-safe and bounded by the absolute session TTL;
- reads fail closed for missing, malformed, incompatible, invalid, expired or
  unauthorized records;
- application validation remains authoritative for the ADR 0009 absolute and
  idle expiry timestamps, authorization state and lifecycle rules;
- touch/update must use explicit preconditions and must not revive a stale,
  expired, invalidated or rotated record;
- session-ID rotation atomically retires the old ID and establishes the new ID,
  with preconditions that prevent concurrent stale requests from retaining or
  restoring the old session;
- delete and invalidation are idempotent; and
- store outages, timeouts and unexpected adapter errors deny the request.

Redis TTL supports cleanup and availability management; it is not the
authoritative security decision. An application-validity check is still
required on every lifecycle read or transition so TTL drift, delayed expiry or
an inconsistent record never extends a session.

### Atomicity and concurrency

The domain contract must express the required outcomes, not depend on a
particular Redis SDK. The initial Redis adapter maps them conceptually as
follows:

| Operation | Required behavior | Conceptual Redis capability |
| --- | --- | --- |
| OAuth/session create | create only if the new ID does not exist, with TTL | `SET` with `NX` and expiry semantics |
| OAuth consume | read and retire exactly once | atomic `GETDEL`-equivalent consume |
| Session touch/update | apply only to the expected current, valid lifecycle state | one atomic server-side operation with explicit preconditions |
| Session rotation/replace | retire old ID and create new ID together, only when the old state still matches | one atomic server-side operation, script or transaction with explicit preconditions |
| Ordinary read/delete | read state or retire it idempotently where no compound transition is needed | ordinary read/delete operations |

`WATCH` is not a required primitive. The chosen adapter must provide the
equivalent atomic guarantees by an operation, script or transaction that runs
server-side. It must prevent stale updates, double consumes and session
resurrection when requests overlap or are retried.

Persistent values are untrusted input when read back. They must be parsed and
schema-validated before use, with an explicit record/key format version.
Malformed, unexpected or deserialization-failed values are security failures:
they are not repaired from browser input, interpreted permissively or replaced
from memory.

### Keys, namespaces and secrets

Every persistent key must include a stable, deployment-unique namespace, a
state-domain discriminator and a format version, for example conceptually:

```text
<namespace>:hosted-studio:v1:oauth:<opaque-id>
<namespace>:hosted-studio:v1:session:<opaque-id>
```

The namespace is configuration, not browser input. It isolates deployments and
environments sharing an Upstash account or Redis database and supports future
format migration without interpreting an old record as a current one.

Session IDs, CSRF tokens, OAuth state, provider tokens, repository credentials
and Redis credentials are secrets. They must not enter page data, client
bundles, browser-readable storage, URLs beyond the necessary OAuth callback
state, error responses, Git history or ordinary logs. Logs and telemetry must
redact them rather than using raw records for diagnosis.

### Deployment boundary and current scope

The state topology refines, but does not alter, the deployment boundary in ADR
0008 and ADR 0009:

- Visitor production remains read-only, receives no Hosted state credentials,
  and keeps `/studio/**` and `/auth/**` unavailable.
- Local Studio retains its filesystem authoring model and does not require
  Hosted persistent-state configuration.
- Hosted Studio uses its separate authoring deployment and the selected
  topology only when explicitly configured.

ADR 0010 does not enable any routes or actions. The current Hosted allow-list
remains exactly:

```text
GET  /studio
GET  /studio/site/social
POST /studio/site/social
```

Every other Hosted Studio route and action remains fail-closed. During issue
#275, Social is the only repository-backed mutation. This ADR adds no upload
scope, multi-file authoring, publishing, RBAC or multi-tenancy.

## Implementation sequence and gates

Implementation for issue #275 must proceed in this order:

1. define async state-store contracts and make in-memory adapters
   async-compatible;
2. add configuration validation, namespace/version rules and strict topology
   selection without fallback;
3. implement the persistent Redis adapter with the atomic lifecycle semantics
   above;
4. propagate async behavior through OAuth, session, route-gate, runtime, HTTP
   auth/logout and SvelteKit seams;
5. add contract tests for create, consume, read, expiry, invalidation, touch
   and rotation, including malformed persisted values;
6. add concurrency and retry tests proving no replay, stale update or stale
   session resurrection, plus outage/timeout fail-closed tests;
7. verify secret non-disclosure and Visitor/Local deployment isolation; and
8. only then configure the private Hosted deployment and retain the existing
   narrow route/mutation allow-list.

The private deployment gate is not satisfied by successful process reuse or an
in-memory test run. Persistent-state contract tests and outage/concurrency
invariants must be green before the real deployment begins.

## Consequences

### Positive

- Hosted security state survives instance replacement and scales across
  concurrent serverless requests.
- OAuth replay, session rotation and lifecycle correctness have explicit,
  testable atomic requirements.
- GitHub remains the sole canonical editorial history and repository authority.
- Local/test adapters retain one application contract with the deployed path.

### Negative

- Hosted authentication and routing seams become asynchronous.
- The authoring deployment acquires a persistent-state dependency and its
  operational failure modes.
- Configuration, schema compatibility, namespace isolation and secret handling
  require explicit tests and operational review.

## Alternatives rejected

### Treat Vercel process memory as durable state

Rejected. Process reuse is an optimization, not a durable or shared security
state guarantee across concurrent requests, scaling, restart or replacement.

### Silent Redis-to-memory fallback

Rejected. It creates split security state and can accept sessions or OAuth
transactions that other instances cannot see. Store failure must fail closed.

### Browser-held session or JWT fallback

Rejected. ADR 0009 requires opaque server-side sessions and does not permit
browser state to become authorization authority or a persistence substitute.

### Make only the Redis implementation asynchronous

Rejected. That would maintain divergent application paths and obscure remote
failure behavior. The store contract and its consumers must be async.

### Use Redis as editorial storage or repository authority

Rejected. GitHub remains canonical editorial history and the server-controlled
GitHub repository credential remains distinct from operator/session state.

### Require `WATCH` for correctness

Rejected. The domain requires atomic outcomes, not a particular client
primitive. A server-side atomic operation, script or transaction with explicit
preconditions is sufficient.

## Related decisions

- ADR 0008 — Hosted Studio architecture.
- ADR 0009 — Hosted Studio authentication and authorization boundary.
- Hosted Studio threat model.
- Issue #82 — Hosted Studio parent epic.
- Issue #275 — first private Hosted Studio deployment; this ADR does not mark
  it complete.
