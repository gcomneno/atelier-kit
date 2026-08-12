# ADR 0011: Public demo runtime isolation

## Status

Accepted.

## Context

Issue #283 introduces an end-to-end public Atelier-Kit demonstration:

**Public Visitor demo → Try Studio → safe change → save → updated Visitor result**

The existing runtime architecture has three different security purposes:

- Visitor is public and read-only;
- Local Studio is trusted local authoring;
- Hosted Studio is authenticated private authoring backed by GitHub identity,
  an explicit authorization allow-list, opaque server-side sessions and
  repository-backed mutations.

A public anonymous demo user is none of those identities.

Representing a guest as a synthetic GitHub identity, bypassing the Hosted
allow-list, or making the ordinary Visitor deployment writable would weaken
existing security contracts.

## Decision

Atelier-Kit adds a fourth explicit runtime:

`ATELIER_STUDIO_MODE=demo`

The canonical runtime classifications are therefore:

- `visitor`
- `local`
- `hosted`
- `demo`
- `invalid`

Demo is a separate authority domain. It is not an alias for Hosted Studio and
does not inherit Hosted authentication or authorization.

### Slice 1: runtime isolation

The first implementation slice introduced runtime classification only.

It established that:

- Demo is recognized as a valid explicit runtime;
- Demo conflicts with Local Studio enablement and resolves to `invalid`;
- `canAccessStudio(demo)` is false;
- the Studio route policy does not admit Demo;
- the Hosted route gate does not resolve sessions for Demo;
- GitHub OAuth login and callback are not eligible in Demo;
- Hosted logout is unavailable in Demo;
- the Hosted mutation guard does not admit Demo.

Recognizing Demo therefore creates no authoring authority by itself.

### Slice 2: guest-session and trusted-context boundary

The second implementation slice adds server-side Demo authority primitives
without connecting them to public routes or repository writes.

The Demo boundary now has:

- an identity-free opaque guest-session lifecycle;
- independent 256-bit session and synchronizer-CSRF secrets;
- a deliberately short 30-minute absolute lifetime;
- a 10-minute idle timeout and 5-minute credential-rotation age;
- a Demo-specific in-memory session-store contract;
- a distinct `__Host-atelier_demo_session` browser cookie;
- a Demo-only route gate;
- an unforgeable trusted Demo request context;
- private CSRF capability storage that is not enumerable on the context.

The Demo context contains no GitHub identity, authorization marker or synthetic
principal. A Demo context is not trusted by the Hosted boundary, and Hosted
context shapes cannot cross into Demo trust.

This slice still does not admit `/studio/**`, create a public session-start
endpoint, perform mutations or configure repository/deployment authority.
Those capabilities require later explicit slices.


### Slice 3: mutation integrity and bounded public authority

The third implementation slice defines the integrity boundary that any future
public Demo mutation must cross before repository authority can be reached.

The Demo mutation boundary requires:

- a deployment-controlled canonical HTTPS Demo origin independent from Hosted;
- exact Host and Origin matching;
- an explicitly supported state-changing HTTP method;
- a genuinely trusted Demo request context;
- synchronizer-CSRF validation using constant-time comparison;
- a bounded mutation budget tied to the guest authority rather than the
  rotating session lookup credential.

The default budget allows five admitted mutation attempts per guest authority.
Its server-side key is derived from the private Demo CSRF capability, so session
ID rotation cannot reset the budget and the raw capability is not stored as the
budget key.

The in-memory budget store introduced by this slice is a reference/test adapter
for the atomic `consume()` contract. It is not the production persistence
decision. A deployed public Demo must connect the same boundary to persistent
server-controlled state with expiry before mutation routes are enabled.

Integrity failures do not consume budget. Budget-store failure fails closed and
is distinct from legitimate budget exhaustion.

This slice still does not connect Demo authority to routes, GitHub authoring,
repository targets, commits or deployments.

## Future Demo authority

Later #283 slices may add public-demo capabilities only through separate,
explicit server-side boundaries.

The intended direction is:

- an unforgeable Demo request context distinct from Hosted request context;
- opaque, short-lived server-side guest sessions with no synthetic GitHub
  identity;
- a distinct secure cookie and persistent state namespace;
- exact Host, Origin, method and synchronizer-CSRF validation;
- a server-side mutation budget/rate limit;
- a dedicated sandbox repository and branch;
- server-fixed writable roots, paths and commit messages;
- deterministic forward-commit reset with optimistic-concurrency handling;
- a separate read-only Visitor deployment showing the sandbox result.

The browser must never choose repository, branch, writable root, commit
message, deployment target or credentials.

## Repository isolation

Before Demo repository writes can be admitted, deployment configuration must
prove that the target is an intentional sandbox and cannot accidentally point
at:

- `gcomneno/atelier-kit`;
- the private Hosted authoring repository;
- the pristine public Visitor demo source.

The repository slice of #283 implements this contract with a fixed
`.atelier/demo-sandbox.json` marker outside Demo writable authority. The marker
binds its purpose to the exact server-configured repository and branch and to a
deployment-controlled opaque marker value.

Before a Demo authoring repository is returned:

- `gcomneno/atelier-kit` is rejected explicitly;
- equality with an explicitly configured private Hosted authoring repository is
  rejected;
- the marker must exist with exact canonical content;
- the marker must be read at a canonical GitHub commit revision.

There is currently no separate repository configuration for a pristine Visitor
source: the ordinary Visitor source is the canonical Atelier-Kit repository
already denied above. The marker requirement provides the additional positive
proof that any other configured repository and branch was intentionally
provisioned as the Demo sandbox.

Demo write authority is then restricted to `config/social.yaml`. The marker
path is outside that writable scope, so Demo authoring cannot create, repair or
replace its own sandbox proof.

The Demo Social adapter reuses the shared Social validation and serialization
contract plus the existing GitHub AuthoringRepository implementation. Marker
verification and Social reads/writes must refer to the same GitHub revision;
branch movement therefore fails closed through optimistic concurrency rather
than carrying forward stale target verification.

This slice still does not wire repository authority into public routes or
create the public guest-session endpoint.

## Public abuse boundary

A public save can cause both a Git commit and a hosting deployment. CSRF and
optimistic concurrency do not limit intentional high-volume use.

Before public writes are enabled, Demo therefore requires an explicit
server-side mutation budget/rate-limit policy in addition to repository
isolation and deterministic reset.

## Non-goals of this decision

This ADR does not:

- make the existing Visitor demo writable;
- expose the private Hosted Studio publicly;
- weaken GitHub OAuth or Hosted authorization;
- implement anonymous sessions yet;
- admit any Demo mutation yet;
- add additional Studio editors;
- define a multi-tenant SaaS architecture.

## Consequences

The runtime model becomes slightly more explicit, but each deployment keeps a
single unambiguous authority profile.

The additional separation prevents future public-demo convenience features from
silently weakening private Hosted Studio or ordinary Visitor production.

## References

- Issue #283 — end-to-end public Atelier-Kit demo experience
- Epic #82 — Hosted Studio with authentication
- ADR 0007 — production-safe Local Studio / Atelier Desktop
- ADR 0008 — Hosted Studio architecture
- ADR 0009 — Hosted Studio authentication and authorization
- ADR 0010 — Hosted Studio persistent state
- #281 / PR #282 — public Visitor demo boundary and live audit
