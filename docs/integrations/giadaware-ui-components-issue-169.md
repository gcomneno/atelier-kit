# GiadaWare UI components integration (issue #169)

## Immutable artifact

- Package: `giadaware-ui-components`
- Package version: `0.0.0`
- Package source commit: `fcdb8693fc69ab37223de76bba714eabaf3a3457`
- Filename: `giadaware-ui-components-0.0.0.tgz`
- SHA-256: `c53b5399520db687f7aef43c15b8b4b6a999a6a80f1bda71e26ff22a35acb7bd`
- Tracked path: `vendor/giadaware-ui-components/fcdb869/giadaware-ui-components-0.0.0.tgz`
- Machine-readable identity: `vendor/giadaware-ui-components/fcdb869/integration.json`
- Dependency: `file:vendor/giadaware-ui-components/fcdb869/giadaware-ui-components-0.0.0.tgz`

The source artifact and tracked copy were both verified against the SHA-256 above. Atelier-Kit installs the tracked copy as a normal relative npm file dependency. It does not use Git, a workspace, a link, a symlink, an external absolute path, the source repository, or a registry publication.

## Adapter boundary and behavior

`AtelierSocialIcon.svelte` is the only visitor adapter. It accepts the existing string ID, calls Atelier-Kit's `normalizeSocialId`, and renders the package root `SocialIcon` only for `instagram`, `facebook`, `x`, or `github`. The package's additional `github-sponsors` registry ID remains inadmissible. The package icon is decorative because each localized enclosing link owns the accessible name. Existing link markup, attributes, layout, `1rem` CSS sizing, and `currentColor` behavior stay in `SiteHeader.svelte` and `SiteFooter.svelte`.

`AtelierFormStatus.svelte` is the only Studio adapter. It keeps `message?: string`, `status?: string`, and `durationMs?: number | null`, passes message text unchanged, maps supported tones explicitly, and maps unknown statuses to `info`. Omitted durations resolve to 5000 ms for `success` and `info`, and to persistent `null` for `warning` and `error`; explicit positive values and explicit `null` pass through unchanged. Package `FormStatus` supplies alert/assertive semantics for errors and status/polite semantics for other tones.

The form adapter maps Atelier's historical visual values through the package's actual public `--giu-form-status-*` tokens, including zero border width. No package source or reserved `/visitor` or `/studio` entry point is used. No third package component is consumed.

The historical `SocialIcon.svelte` and `StudioFormStatus.svelte` files remain present and byte-for-byte unchanged as the immediate rollback path. The old global `.status` styling remains available.

## Scaffold and upgrade safety

Fresh scaffolds already copy the package manifest, lockfile, and vendored artifact as part of the repository tree. The issue-169 upgrade safeguard is deliberately narrow: before any normal `src/` or `scripts/` work, `site-upgrade` verifies the source artifact and identity, checks every preserve rule that can affect the integration, and plans only this exact tarball, identity record, and `giadaware-ui-components` dependency. It does not introduce generic dependency or registry migration logic. A preserved artifact or identity is accepted only when the existing client file exactly matches the required bytes. A preserved `package.json` is accepted only when its dependency is already the exact portable `file:` value; otherwise preflight aborts with remediation before any target mutation, and a matching preserved `package.json` is never rewritten.

The artifact is installed through a temporary sibling, SHA-256 verification, and atomic rename. The identity is likewise verified and atomically replaced, then `package.json` is atomically written only after the final artifact checksum succeeds. A later integration-step failure restores the preceding artifact and identity state. Normal file plans run only after this focused transaction succeeds, so an unrelated copy failure cannot leave a new dependency pointing at absent or invalid package bytes. `npm install` is printed only when the dependency or immutable artifact changed; otherwise the next steps are only `npm run check` and `npm run build`.

No files under `config/`, `content/`, or `static/` were changed. There is no client schema, YAML, or application-content migration.

## Validation record

Run on 2026-07-13 on branch `feat/169-integrate-ui-components`:

- `npm install --cache /tmp/atelier-kit-npm-cache` — passed; exact local package installed and lockfile updated.
- `npm test` — passed; 17 test files, 0 failures. The issue-169 coverage includes compiled Svelte SSR behavior, real package class forwarding, preserve and transaction failure injection, upgrade instruction ordering, npm SHA-512 lock integrity, and the single-runtime Svelte peer relationship from a shared clean `npm ci` fixture.
- `npm run check` — passed with 0 errors and 0 warnings. The command still prints the existing Desktop Vite-config discovery message before the successful result.
- `npm run build` — passed, including SSR/client compilation and the Vercel adapter output.
- `npm run content:validate` — passed.
- `npm ls svelte --all` — passed; every consumer is deduped to the single `svelte@5.56.4` runtime.
- `git diff --check` — passed.
- Protected-path comparison against `/tmp/atelier-kit-169-protected-before.sha256` — passed.

The integration tests build one temporary fixture by copying the tracked `package.json`, `package-lock.json`, immutable vendor directory, adapters, and their focused helper modules. They run `npm ci` with a stable temporary cache, resolve Vite, Svelte, and `giadaware-ui-components` only from that fixture, compile copied byte-identical adapters there, inspect the deterministic lock tree and physical installation, and remove the fixture after the test file completes. Repository-root `node_modules` is not used as package-resolution or singleton evidence.

`npm install` reported four low-severity audit findings in the existing resolved dependency graph; no automatic audit fix was applied.

## Immediate rollback

1. Change `SiteHeader.svelte` and `SiteFooter.svelte` imports from `AtelierSocialIcon.svelte` back to the unchanged local `SocialIcon.svelte`.
2. Change Studio page imports from `AtelierFormStatus.svelte` back to the unchanged local `StudioFormStatus.svelte`.
3. Remove the two adapters and their pure mapping helpers and tests.
4. Remove `giadaware-ui-components` from `package.json`, regenerate `package-lock.json`, and remove the focused vendor directory and upgrade safeguard.
5. Run install, tests, check, build, content validation, Svelte-tree inspection, and protected-path verification again.

This procedure was rehearsed successfully in a disposable worktree; the measured result is recorded below.

## Timed rollback rehearsal

The rollback procedure was executed on 2026-07-13 in a disposable detached Git worktree.

- integration commit: `31edd036d4b4f47c9edd3e9714eb8d10e5e60d39`
- restored pre-integration commit: `d47dcf6d4fc92c08c53004fa07fd7e16881a4038`
- elapsed time: **24 seconds**
- inverse commit application: passed without conflicts
- restored tree: exactly matched the pre-integration commit
- local `SocialIcon` and `StudioFormStatus` components: restored
- package dependency, adapters and vendored artifact: removed
- `config/`, `content/` and `static/`: unchanged
- content/config migration required: none
- accepted integration branch modified by rehearsal: no

Rollback validation passed:

- `npm ci`
- `npm test`
- `npm run check`
- `npm run build`
- `npm run content:validate`
- `npm ls svelte --all`
- `git diff --check`

After the disposable worktree was removed, the accepted integration branch still pointed to the original integration commit with a clean working tree.

