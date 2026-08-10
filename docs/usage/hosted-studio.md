# Private Hosted Studio operator runbook

This is the canonical runbook for the first **private** Hosted Studio deployment
selected by issue #275. It is not a public/client-facing Hosted rollout; that
still requires a separate security review. Read [ADR 0008](../architecture/adr-0008-hosted-studio-architecture.md),
[ADR 0009](../architecture/adr-0009-hosted-studio-authentication-authorization.md),
[ADR 0010](../architecture/adr-0010-hosted-studio-persistent-state.md), and
the [Hosted Studio threat model](../security/hosted-studio-threat-model.md) for
the governing decisions and controls.

## Runtime and deployment boundary

These are three different modes; do not transfer credentials or assumptions
between them.

| Mode | Purpose | Studio behavior |
| --- | --- | --- |
| Ordinary visitor production | Public client-facing site | `/studio/**` and `/auth/**` fail closed (404); no Hosted credentials. |
| Local Studio | Authoring from a checkout/Atelier Desktop | Filesystem edits and local Git/Vercel publishing remain local-only capabilities. |
| Private Hosted Studio | Separate, explicitly configured authoring deployment | Authenticated, authorized, GitHub-backed authoring with the limited surface below. |

The private deployment provider is Vercel, using dedicated project
`atelier-kit-hosted-studio`, at
<https://atelier-kit-hosted-studio.vercel.app>, in `fra1`. Its callback is
<https://atelier-kit-hosted-studio.vercel.app/auth/github/callback>. It uses
the `persistent-redis` state topology through Upstash Redis from the Vercel
Marketplace; the resource is `atelier-kit-hosted-state`.

It is fixed to `gcomneno/atelier-kit`, branch
`issue-275-hosted-validation`, writable root `config`, and the currently
admitted mutation path `config/social.yaml`. The validation branch is a
controlled temporary target for #275 and must not be confused with `main`.

## Configuration and credentials

Set the following environment variables on the private authoring deployment.
The groups describe the sensitivity of their values, independently of whether
the Vercel UI currently stores a value as Sensitive.

### Activation and non-secret configuration

```text
ATELIER_STUDIO_MODE=hosted
ATELIER_STUDIO_PRIVATE_POC=1
ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY=persistent-redis
```

### Deployment/security configuration

These values are not intrinsically credentials, although the current deployment
may store them as Sensitive:

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

Never put a secret value in documentation, logs, browser data, Git history, or
screenshots. Do not record token, session, or CSRF values anywhere outside the
server-side secret store.

## GitHub OAuth and operator authorization

The OAuth application currently used is **Atelier Kit Hosted Studio**. Its
callback must exactly match
`https://atelier-kit-hosted-studio.vercel.app/auth/github/callback`.

OAuth authentication identifies an operator; it does not grant authoring
authority. Authorization uses stable numeric GitHub subjects in the deployment
allow-list. An operator can safely discover their subject with:

```bash
gh api user --jq '.id'
```

Do not treat a specific subject as a universal project default. The #275
validation operator subject was `126195429`.

## Repository credential

Use a dedicated fine-grained PAT, separate from the OAuth identity/token.
Select `gcomneno/atelier-kit` explicitly, grant **Repository permissions →
Contents: Read and write**, and retain the GitHub-required **Metadata:
Read-only** permission. This vertical needs no broader repository permissions.

A successful GET against a public repository is not proof that the PAT has
repository authority: public content can be readable without token authority.
Verify a controlled write through the admitted path instead.

## Deploy, redeploy, and promotion

Environment changes affect subsequent deployments, not an already-running
deployment. Deploy the intended feature revision; before explicit canonical
promotion, verify that it is Ready, in `fra1`, and passes the root smoke check.
Canonical promotion is an explicit operator action.

Redis state is shared and persistent. It must never fall back to process memory;
sessions were observed surviving real redeploys. Keep the previous known-good
deployment as the rollback target. After a temporary security-policy test,
restore both the intended configuration value and a deployment snapshot that
uses that intended configuration.

## Admitted Hosted surface

Only these Hosted routes are admitted:

- `GET /studio`
- `GET /studio/site/social`
- `POST /studio/site/social`
- authentication lifecycle: `GET /auth/github/login`, `GET /auth/github/callback`,
  and `POST /auth/logout`

All other Studio pages and actions remain fail-closed. The Hosted UI exposes
only Overview, Social, and Preview. Local filesystem, Git, and Vercel-CLI
publishing are not Hosted capabilities.

## Operator smoke test

Run this against the canonical authoring origin after a deployment or promotion:

1. As an anonymous browser, request `/studio`; it must enter authentication.
2. Sign in as an allow-listed operator; `/studio` must show the dashboard.
3. Read Social, then save one valid Social change and confirm the expected
   controlled-branch revision advances.
4. Submit a save with a stale revision; it must fail without a branch advance.
5. Submit with a wrong CSRF value; it must fail without a branch advance.
6. `POST` logout, then confirm `/studio` again requires authentication. Logout
   is POST-only: navigating to a logout URL with GET is not logout.
7. Exercise an unknown, syntactically valid session and confirm it is cleared
   and redirected to authentication.
8. After every mutation and failure case, verify both `main` and the controlled
   validation branch; only the intended successful mutation may advance the
   controlled branch, and `main` must not move.

## Rollback or disable

1. Restore the known-good allow-list and other intended configuration values.
2. Roll back or promote the known-good deployment, as appropriate, and ensure
   the selected snapshot actually uses those restored values.
3. If Hosted configuration is disabled or incomplete, it must fail closed.
   Never address an outage by falling back to in-memory authority.
4. After recovery, verify canonical `/` and anonymous `/studio` behavior.

## Issue #275 deployment validation record

### Live production evidence

The final capability-aware deployment used feature revision
`2e7be819a043b89f454ab6ecf9967731a93f8c7f`. The normal known-good deployment
was `dpl_FjWHTCwtEc8oLGe1uguzi7nP1vsG`; the temporary
authorization-revocation deployment was `dpl_Cmhc3L9ZA7XEzCJdYHaY7ftAArFY`.
The normal deployment was restored after that test.

The controlled branch began at
`5bf517ea2b3df8b5a23c66ba07abaf4290ab8f16`. One valid Social save advanced
only `issue-275-hosted-validation` to
`f28a2ea84eba98db34217ce11e019da5b60367e8`; only `config/social.yaml`
changed. `main` remained at `5bf517ea2b3df8b5a23c66ba07abaf4290ab8f16`.

Observed live failure and security outcomes:

- A stale authoring revision returned a SvelteKit `ActionResult` failure with
  application status 409 and did not advance the branch.
- A wrong CSRF value returned 403 and did not advance the branch.
- A wrong cross-site `Origin` returned HTTP 403 before authoring and did not
  advance the branch. This observed rejection came from SvelteKit's framework
  CSRF/origin boundary, so it is defense in depth and is **not** live proof
  specifically of the custom `HostedMutationGuard` Origin branch.
- An unknown syntactically valid session returned 302 to
  `/auth/github/login?returnTo=%2Fstudio` and explicitly cleared the stale
  session cookie.
- A valid POST logout returned 200, cleared browser session transport,
  invalidated server authority, and made the next `/studio` require
  authentication.
- An initially under-scoped fine-grained PAT caused a generic 503 repository
  write failure; no branch advanced and no credential leaked.
- Session authority survived an actual redeployment, demonstrating persistent
  Redis rather than dependence on one process.
- Not-yet-admitted Studio routes stayed 404/fail-closed.

For the authorization-revocation test, production's allow-list was temporarily
changed to subject `1` in a separate deployment while the browser retained an
already-valid Hosted session for subject `126195429`. `GET /studio` returned
403 under the current allow-list. This proves authorization is re-evaluated
against current deployment policy for an existing session; it was **not** a
fresh unauthorized OAuth callback test. The configuration and deployment were
restored and verified afterwards; `main` and the validation branch were
unchanged by this test.

There is no separate Atelier-Kit visitor Vercel project in the giadaware scope.
The private project created by #275 is the dedicated Hosted authoring
deployment. Therefore no live visitor-deployment secret audit is claimed.

### Automated coverage (not live observations)

Automated evidence covers expired-session handling, missing-`Origin` handling,
unauthorized fresh OAuth callback behavior, and OAuth/store outage paths not
otherwise observed live. It also covers the Local/Visitor runtime matrix and
Local-only publish import isolation.

The targeted Visitor/Local/Hosted authority gate passed 112/112, and the
targeted Local-only publish-path architecture gate passed 14/14. These are
executable architecture/test evidence, not live visitor-deployment evidence.

Before this documentation change, the full gate at
`2e7be819a043b89f454ab6ecf9967731a93f8c7f` was green: 700/700 tests,
`svelte-check` with zero errors and warnings, production build, and content
validation. This is pre-documentation validation; run the final gate again
after the docs change.
