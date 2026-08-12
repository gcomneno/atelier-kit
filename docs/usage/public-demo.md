# Public Demo deployment

Atelier-Kit's public Demo is a separate runtime and authority domain for the
bounded Visitor → Try Studio → Social edit → Visitor experience.

It is neither ordinary Visitor production nor private Hosted Studio.

## Runtime

```text
ATELIER_STUDIO_MODE=demo
ATELIER_DEMO_PUBLIC=1
```

`ATELIER_DEMO_PUBLIC` must be exactly `1`.

Missing, partial or malformed Demo configuration fails closed.

## Canonical origin

```text
ATELIER_DEMO_CANONICAL_ORIGIN=https://demo.example.com
```

The canonical origin must use HTTPS.

Demo bootstrap and Demo mutations require exact Host and Origin matching.

## Persistent security state

Production Demo requires persistent Redis state:

```text
ATELIER_DEMO_STATE_REDIS_REST_URL=<server-only>
ATELIER_DEMO_STATE_REDIS_REST_TOKEN=<server-only>
ATELIER_DEMO_STATE_NAMESPACE=<deployment-unique>
ATELIER_DEMO_ISSUANCE_SECRET=<canonical 256-bit base64url secret>
```

The namespace must be unique to this Demo deployment/environment.

Redis credentials and the issuance secret are server-only.

## Sandbox repository

```text
ATELIER_DEMO_GITHUB_REPOSITORY=<dedicated sandbox owner/name>
ATELIER_DEMO_GITHUB_BRANCH=<dedicated sandbox branch>
ATELIER_DEMO_GITHUB_TOKEN=<server-only restricted credential>
ATELIER_DEMO_SANDBOX_MARKER=<canonical 256-bit base64url marker>
```

The configured repository must not be:

- `gcomneno/atelier-kit`;
- the private Hosted Studio repository.

The configured branch must already contain:

```text
.atelier/demo-sandbox.json
```

with the exact marker document expected by the Demo sandbox-target contract.

The marker sits outside Demo writable authority.

Demo authoring is fixed to:

```text
config/social.yaml
```

The browser cannot choose repository, branch, path or commit message.

## Public route surface

The initial public Demo admits only:

```text
POST /demo/start
GET  /studio/site/social
POST /studio/site/social?/saveSocial
```

Other Studio routes remain unavailable to Demo guests.

## Guest lifecycle

Default guest policy:

- absolute lifetime: 30 minutes;
- idle timeout: 10 minutes;
- lookup-credential rotation: 5 minutes;
- mutation budget: 5 admitted mutations per guest authority;
- session issuance: bounded per trusted subject and deployment-wide.

The browser receives only the opaque Demo session cookie and the synchronizer
CSRF value needed by the admitted Social form.

## Vercel issuance boundary

The initial Vercel deployment derives the issuance subject only from the
Vercel-owned forwarded client-IP boundary.

Do not add fallback trust to browser-controlled or ordinary forwarding headers.

If another proxy or CDN is placed in front of Vercel, re-audit this boundary
before enabling the public Demo.

## Deterministic reset

The shared sandbox is not reset automatically when one guest session expires.

Run:

```text
npm run demo:reset-social
```

with the same server-side Demo sandbox environment.

The reset:

- re-verifies the sandbox marker;
- keeps repository, branch and path fixed server-side;
- restores:

```yaml
social:
  links: []
```

- appends the fixed commit:

```text
demo: reset social links
```

- preserves optimistic concurrency;
- never force-pushes or rewinds Git history;
- is not exposed through HTTP.

Deployment operations may schedule this command if a periodic reset cadence is
desired.

## Failure behavior

The public Demo fails closed when:

- persistent state is missing, malformed or unavailable;
- canonical Host/Origin validation fails;
- a trusted issuance subject is unavailable;
- issuance or mutation budgets are exhausted/unavailable;
- the guest session is missing, stale or expired;
- synchronizer CSRF validation fails;
- sandbox verification fails;
- repository revision changes during optimistic concurrency;
- repository authority is unavailable.

It never falls back to Local Studio, Hosted Studio, in-memory production state
or browser-selected repository authority.
