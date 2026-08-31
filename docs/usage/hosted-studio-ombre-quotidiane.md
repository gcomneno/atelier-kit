# Ombre Quotidiane private Hosted Studio operator runbook

This runbook records the current consumer-specific operating contract for Ombre Quotidiane, whose repository authority is `gcomneno/ombre-quotidiane` and whose public Vercel project name is `ombre-quotidiane`. It supplements `docs/usage/hosted-studio.md`; the general Hosted security model remains governed by ADR 0008, ADR 0009, ADR 0010, and `docs/security/hosted-studio-threat-model.md`.

The currently observed Vercel production alias is `https://nero-quotidiano.vercel.app`. That alias is deployment state, not the current display name, repository authority, or public Vercel project identity. Do not claim `https://ombre-quotidiane.vercel.app` is the deployed production URL unless it has been explicitly observed and promoted.

The scope is intentionally bounded to the private Hosted surface already admitted by Atelier-Kit. This document does not authorize additional routes, repositories, branches, writable roots, image destinations, deployment credentials, or browser-selected targets.

## Deployment separation

Ombre Quotidiane has a public Visitor deployment and may optionally have a separate private Hosted Studio deployment when one is explicitly provisioned for the current consumer.

- public Visitor: Vercel project `ombre-quotidiane`, currently observed production alias `https://nero-quotidiano.vercel.app`;
- private Hosted Studio: optional, private, separate infrastructure with no known current `ombre-quotidiane-hosted-studio` deployment at the time of this runbook update.

The Visitor project is ordinary production. `/studio/**` and `/auth/**` must remain unavailable/fail-closed there and no Hosted credentials belong in that project.

A Hosted Studio project, if provisioned, is the only browser-accessible authoring deployment. It is not a public Visitor replacement and must not inherit authority from the Atelier-Kit validation Hosted deployment, obsolete `nero-quotidiano-hosted-studio` infrastructure, or the public Demo runtime.

The Git repository remains the canonical content history. Hosted Studio commits to the configured repository branch; the Visitor is updated only through the repository's normal Vercel Git deployment pipeline.

## Fixed repository authority

Any current Ombre Quotidiane Hosted deployment must be fixed server-side to:

```text
repository:     gcomneno/ombre-quotidiane
branch:         main
writable roots: config,static/images/site
```

The currently admitted private Hosted editors are:

- `GET /studio`;
- `GET|POST /studio/site/social`;
- `GET|POST /studio/site/hero`;
- `GET /auth/github/login`;
- `GET /auth/github/callback`;
- `POST /auth/logout`.

Social authoring owns `config/social.yaml` and its server-defined commit message.

Hero authoring reads and updates `config/site.yaml` and uses only the branded server-owned Hero image slot under `static/images/site`. Browser filename, MIME type, extension, path-like values, repository, branch, writable roots, destination, and commit message do not confer authority.

All not-yet-admitted Studio routes/actions remain fail-closed.

## Hosted runtime configuration

Hosted Studio is optional, private, separate infrastructure. For Ombre Quotidiane, no current Hosted Studio project, canonical Hosted origin, OAuth callback, or state namespace is known from the current naming prerequisite. Do not invent replacements from the obsolete `nero-quotidiano-hosted-studio` deployment.

If Hosted Studio is explicitly provisioned for the current consumer, the Hosted project requires the explicit private Hosted runtime and persistent state topology:

```text
ATELIER_STUDIO_MODE=hosted
ATELIER_STUDIO_PRIVATE_POC=1
ATELIER_STUDIO_PRIVATE_POC_STATE_TOPOLOGY=persistent-redis
ATELIER_STUDIO_CANONICAL_ORIGIN=<current Ombre Quotidiane Hosted Studio origin>
ATELIER_STUDIO_GITHUB_CALLBACK_URL=<current Ombre Quotidiane Hosted Studio origin>/auth/github/callback
ATELIER_STUDIO_GITHUB_REPOSITORY=gcomneno/ombre-quotidiane
ATELIER_STUDIO_GITHUB_BRANCH=main
ATELIER_STUDIO_GITHUB_WRITABLE_ROOTS=config,static/images/site
ATELIER_STUDIO_STATE_NAMESPACE=<current Ombre Quotidiane Hosted Studio state namespace>
```

The deployment also requires a validated operator allow-list, OAuth client identifier, OAuth callback configured for the current Hosted origin, persistent Redis URL, and the secret values listed below. Never copy values from another Hosted, Demo, Visitor, or Local environment merely because the variable names match.

## Credentials and secret boundaries

The following values are server-side credentials and must never be committed, logged, rendered to the browser, pasted into issue comments, or recorded in screenshots:

```text
ATELIER_STUDIO_GITHUB_CLIENT_SECRET
ATELIER_STUDIO_GITHUB_TOKEN
ATELIER_STUDIO_STATE_REDIS_REST_TOKEN
```

The OAuth client ID and Redis REST URL are deployment configuration rather than authorization by themselves, but should still be handled as operational configuration rather than application content.

Use a dedicated fine-grained GitHub repository token for Hosted repository writes. It must be restricted to `gcomneno/ombre-quotidiane` and grant only the repository permissions required by the GitHub authoring adapter: Contents read/write plus GitHub-required Metadata read-only. Do not reuse an OAuth access token as repository authority.

OAuth authentication does not imply authorization. Current authorization is a server-side allow-list of stable GitHub numeric subjects. A logged-in identity outside that allow-list must not receive authoring state or mutation authority.

Persistent Hosted session/OAuth state uses the configured Redis resource. Production must fail closed if persistent state is unavailable; it must not silently fall back to process-local memory.

## Operator login and smoke check

After an explicitly provisioned current Hosted deployment:

1. Request `/studio` anonymously at the canonical Hosted origin; it must enter the GitHub authentication flow rather than expose authoring state.
2. Authenticate as an allow-listed operator; the dashboard must expose only the admitted Hosted surface.
3. Open Social and Hero and confirm both show the repository-backed authoring revision.
4. Confirm an unadmitted Studio route remains fail-closed.
5. Confirm the public Visitor still returns 404/fail-closed for representative `/studio/**` and `/auth/**` routes.
6. Logout with the provided POST action and confirm the next Hosted `/studio` request requires authentication again.

Do not use the public Visitor to test Hosted authority and do not put Hosted credentials into the Visitor project.

## Repository-backed save contract

A successful Hosted save means the configured repository branch advanced by the admitted repository mutation. It does not grant deployment authority to the browser.

The required mutation properties are:

- validation before repository advancement;
- exact Host/Origin/method/CSRF boundaries before mutation authority;
- repository/branch/path/image destination/commit message fixed server-side;
- optimistic concurrency using the authored revision;
- stale revisions rejected without retry or silent overwrite;
- one logical mutation advances the branch at most once;
- Hero image and YAML changes committed atomically;
- unrelated YAML representation preserved.

The operator UI may show the new authoring revision immediately after a successful save. Visitor deployment status is a separate hosting concern.

## Visitor deployment contract

`gcomneno/ombre-quotidiane` is connected to the public `ombre-quotidiane` Vercel project. The currently observed production alias is `https://nero-quotidiano.vercel.app`; that alias must not be mistaken for the current display, repository, or Vercel project identity.

Hosted Studio itself does not invoke Vercel, store browser deployment credentials, or reuse the Local Studio Git/Vercel CLI publication path. If a current Hosted Studio project is explicitly provisioned and a Hosted commit to `main` succeeds, the public Visitor updates through the repository's normal Vercel Git production pipeline.

A deployment delay or failure does not undo, repeat, or modify an already-successful repository commit. Treat repository state and hosting state as separate checkpoints.

## Provisioning the optional Hosted Studio

Hosted Studio must be provisioned as a dedicated project separate from the Visitor project before use. Do not relink the canonical Visitor checkout merely to deploy Hosted Studio, and do not reuse obsolete `nero-quotidiano-hosted-studio` configuration as current Ombre Quotidiane authority.

Before production deployment from a dedicated clean worktree linked to the explicitly provisioned current Hosted Studio project:

```bash
cd /path/to/ombre-quotidiane-hosted-worktree
git fetch origin --prune
git switch --detach origin/main
git status --short --branch
git rev-parse HEAD
cat .vercel/project.json
npm ci
npm run check
npm run build
```

Verify that the worktree is clean, `HEAD` equals the intended `origin/main`, and the Vercel project link names the explicitly provisioned current Hosted Studio project. Then deploy explicitly:

```bash
vercel --prod --scope giadaware
```

Verify the resulting deployment and canonical alias for the explicitly provisioned current Hosted Studio project.

## Recovery and rollback

Repository content recovery and Hosted deployment recovery are separate operations.

For authored content:

1. Prefer a new controlled forward mutation through Hosted Studio when the admitted editor can restore the intended content safely.
2. If repository-level recovery is required, use ordinary Git history/review practices outside the browser authority boundary; never rewrite published history to hide a Hosted mutation.
3. After recovery, verify the repository revision and the resulting Visitor deployment independently.

For Hosted runtime/deployment recovery, if an explicitly provisioned current Hosted Studio project exists:

1. Inspect recent deployments for that current Hosted Studio project and identify the last known-good production deployment.
2. Restore intended environment configuration in Vercel without exposing values in logs or issue comments.
3. Redeploy/promote only a known-good source revision linked to the Hosted project.
4. Verify the canonical Hosted alias, anonymous authentication gate, allow-listed login, and persistent session behavior.
5. If configuration is incomplete or persistent state is unavailable, leave the runtime fail-closed rather than weakening the boundary.

For public Visitor recovery, use the normal Ombre Quotidiane repository/Vercel Git pipeline. Hosted Studio has no authority to choose or execute arbitrary Visitor deployments.

## Issue #299 live validation record

The dedicated consumer validation completed on 2026-08-19 against real `gcomneno/nero-quotidiano` `main` authority.

Observed evidence includes:

- dedicated Hosted Studio and public Visitor remained separate;
- anonymous Hosted Studio requests were authentication-gated;
- allow-listed GitHub OAuth login succeeded;
- persistent Redis-backed state was active;
- real Social save advanced Nero `main`, triggered the normal Visitor production pipeline, and became visible publicly;
- stale Social submission was rejected without repository advance or partial mutation;
- Hosted Social rollback restored the prior value and propagated normally;
- live Hero create, cross-format replace, remove, and metadata-only operations used server-owned paths and atomic repository mutation;
- independent pre-existing `static/images/site/hero-banner.png` remained untouched;
- findings #309 and #310 were fixed and then revalidated in the real consumer deployment;
- final Hero create commit `5386f15a36b3a0284ebde5c0deb4a8789d103f38` added only `site.hero_banner` plus `static/images/site/hero-banner.jpg`;
- final Hero remove commit `caa54ac42f734af889241fc70dbc8a1e74a3ebb2` removed only that block and controlled JPEG asset;
- after cleanup, `config/site.yaml` returned byte-identically to the pre-test baseline SHA-256 `d15e28e17b30e8393083f8077543ca5e71d93e5cc4fafc43455f073ff97e7f05` and there was no net Hero asset diff;
- the corrected operator success message rendered as `Hero banner salvato.` rather than the internal translation key;
- the create/remove commits each triggered normal public Visitor Production deployments that reached Ready state.

Live authorization evidence covers anonymous denial and a previously validated current-policy denial for an existing authenticated session. Fresh authenticated-but-unauthorized callback/session denial is additionally covered by automated tests; it was not repeated with a second live GitHub identity during #299.

## Final bounded Hosted scope after #299

The useful private Hosted scope for this phase is intentionally **Social + Hero**. The #299 proof demonstrates a complete text-only and image-bearing repository-backed journey without widening authority further.

Additional editors are not required to close #82. Any future route must justify product value and pass the same explicit runtime, authentication, authorization, route-gate, mutation, repository-scope, concurrency, upload, and Visitor-separation review before admission.
