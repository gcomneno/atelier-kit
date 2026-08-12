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

## Public Demo runtime composition

Slice 5 connects the previously isolated Demo boundaries into the narrow
public flow:

**Visitor → Try Studio → Social edit → save → Visitor**

Public Demo composition is enabled only when all required server-side
configuration is complete. Partial, malformed or unavailable configuration
fails closed and does not fall back to process-memory production state.

Production Demo security state uses persistent Redis for:

- opaque guest sessions;
- per-guest mutation budgets;
- per-subject session-issuance budgets;
- deployment-wide session-issuance budgets.

Guest sessions remain identity-free. They contain no GitHub identity,
authorization principal or Hosted Studio capability.

Public session bootstrap is available only through exact:

```text
POST /demo/start
```

on the deployment-controlled canonical HTTPS Demo Host and Origin.

For the initial Vercel deployment, the issuance subject is derived only from
the Vercel-owned forwarded client-IP boundary. Ordinary forwarding headers are
not fallback authority. The raw subject is HMAC-derived before persistent
counter keys are created.

The admitted Demo Studio surface is intentionally narrow:

```text
GET  /studio/site/social
POST /studio/site/social?/saveSocial
```

The Demo Studio shell may render only after a genuinely trusted Demo context
has been established. Other Studio child routes retain their existing
Local/Hosted guards and therefore remain unavailable to Demo guests.

The Visitor home exposes only a presentation-level `Try Studio` action when
public Demo configuration is complete. Browser-visible navigation exposes only
Social authoring and a path back to the public Visitor result.

Repository, branch, writable path, commit message, Redis credentials,
repository credentials, issuance secret and deployment target remain
server-controlled.

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

Repository authority is now wired only into the admitted Demo Social route,
after trusted-session, request-integrity, CSRF and mutation-budget checks.

## Public abuse boundary

A public save can cause both a Git commit and a hosting deployment. CSRF and
optimistic concurrency do not limit intentional high-volume use.

Public writes are therefore admitted only after the persistent mutation
budget and independent session-issuance limits have allowed the request.

## Expiry, reset and recovery

Guest authority is deliberately short-lived:

- 30-minute absolute session lifetime;
- 10-minute idle timeout;
- 5-minute lookup-credential rotation age;
- five admitted mutations per guest authority by default;
- bounded per-subject and deployment-wide session issuance.

Session expiry revokes guest authoring authority but does not automatically
rewrite the shared sandbox repository. Resetting the repository when one guest
expires could overwrite another active guest's work.

Sandbox recovery is therefore a separate operator/server operation:

```text
npm run demo:reset-social
```

The reset operation:

1. re-verifies the configured sandbox marker at the current branch revision;
2. restores only `config/social.yaml`;
3. writes the canonical baseline `social.links: []`;
4. uses optimistic concurrency against the verified revision;
5. appends the fixed commit `demo: reset social links`;
6. never force-pushes or rewinds Git history.

The reset primitive is not exposed through HTTP and accepts no browser-selected
repository, branch, path, baseline or commit message.

Because the sandbox is shared, reset is intentionally not tied to one guest
session. Deployment operations may schedule the operator command at an
appropriate cadence without changing browser authority.

## Non-goals of this decision

This ADR does not:

- make the existing Visitor demo writable;
- expose the private Hosted Studio publicly;
- weaken GitHub OAuth or Hosted authorization;
- add identity/accounts to anonymous Demo guests;
- admit Demo mutations outside the fixed Social document;
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
