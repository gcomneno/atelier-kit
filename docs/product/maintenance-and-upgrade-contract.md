# Maintenance and upgrade contract

## Purpose and scope

This document defines the customer maintenance and upgrade contract for
Atelier-Kit sites maintained by GiadaWare.

It describes the existing Atelier-Kit architecture and support policy. It does
not create new implementation behavior, a generic migration framework, a managed
hosting service, or indefinite support.

The contract applies to customer-owned Atelier-Kit showcase sites when a
maintenance or upgrade relationship explicitly includes that work.

## Contract principles

Atelier-Kit is a bounded micro-CMS for creative showcases. Maintenance and
upgrade work MUST preserve that product boundary.

Normal maintenance MUST be scoped to Atelier-Kit core, supported configuration
and content files, supported media paths, and the finite upgrade behavior
implemented by the Kit.

Maintenance MUST NOT imply:

- indefinite support for every historical release;
- generic backward compatibility for arbitrary custom code;
- automatic migration for every schema or feature change;
- customer infrastructure ownership by GiadaWare;
- guaranteed availability or behavior of third-party services;
- conversion of bespoke customer extensions into Atelier-Kit core obligations.

Compatibility guarantees exist only for boundaries that are explicitly
documented and verified.

Consumer-owned configuration, content and media MUST remain protected according
to the existing upgrade contract.

## Ownership matrix

| Area | Primary owner | Maintenance meaning |
| --- | --- | --- |
| Atelier-Kit core source under managed `src/` and `scripts/` paths | GiadaWare / Atelier-Kit | Maintained within the contracted supported version. Normal upgrades may replace managed files with Kit versions. |
| Kit-managed runtime dependency requirements | GiadaWare / Atelier-Kit | The upgrade tool synchronizes the finite dependency requirements required by managed Kit source. |
| `config/` | Customer | Customer-owned site configuration. Normal `site:upgrade` MUST NOT overwrite it. |
| `content/` | Customer | Customer-owned editorial content. Normal `site:upgrade` MUST NOT overwrite it. |
| `static/images/items/` | Customer | Customer-owned item media. Normal `site:upgrade` MUST NOT overwrite it. |
| Other supported Studio-managed media paths | Shared by contract | Studio may write admitted paths; maintenance must respect documented authoring boundaries. |
| `.atelier-kit-preserve` entries | Customer, subject to review | Preserved files are skipped by normal upgrade. Entries covering core-managed paths indicate a fork/manual-review condition. |
| Bespoke customer code or design extensions | Customer unless separately contracted | Does not automatically become Atelier-Kit core maintenance scope. |
| Customer Git repository and editorial history | Customer | Git/GitHub remains the canonical project history. Maintenance requires recoverable repository state or equivalent backup. |
| Customer accounts, credentials, domains, hosting projects and third-party services | Customer unless separately contracted | GiadaWare is not responsible for these unless a managed-service agreement explicitly assigns them. |

## Supported upgrade path

The supported upgrade path is the repository-backed Atelier-Kit site upgrade
workflow.

For an existing client site, the normal upgrade command is:

```bash
npm run site:upgrade -- --from ../atelier-kit
```

A dry run is available:

```bash
npm run site:upgrade -- --from ../atelier-kit --dry-run
```

The existing upgrade tool:

- syncs managed `src/` and `scripts/` files from the Kit;
- installs a missing `vite.config.js`;
- updates only known, unmodified legacy Kit Vite configurations;
- leaves customized or unrecognized Vite configurations intact and flags them
  for manual resolver adoption;
- merges Kit npm scripts into `package.json`;
- synchronizes the finite Kit-owned runtime dependencies required by managed
  source;
- writes `.atelier-kit-source`, `.atelier-kit-version` and
  `.atelier-kit-upgrade.json`;
- prints a plan and requires confirmation unless `--yes` is used;
- never overwrites `config/`, `content/` or `static/images/items/`.

Supported upgrade work SHOULD start from a released Atelier-Kit version or a
clearly identified Kit checkout.

The tracked applied version is `.atelier-kit-version`, with
`.atelier-kit-upgrade.json` retained for historical compatibility.

## Preserve and bespoke-extension rules

`.atelier-kit-preserve` is the existing escape hatch for exceptional
customer-owned files that must not be replaced during normal `site:upgrade`.

Preserve rules SHOULD be narrow and documented.

Preserve rules MUST NOT be treated as a generic extension system.

Paths listed in `.atelier-kit-preserve` are skipped by the upgrade plan. This
protects the customer file, but it also means the file may not receive Kit fixes
automatically.

Core-managed paths in `.atelier-kit-preserve` represent a fork/manual-review
condition.

Consumer-specific extensions do not automatically become Atelier-Kit core
maintenance obligations. GiadaWare SHOULD prefer narrow documented extension
seams where the product already supports them, or upstream bounded Kit changes
when an extension belongs in core.

## Upgrade lifecycle

A normal maintenance upgrade SHOULD follow this lifecycle:

1. Confirm the customer site version and repository state.
2. Confirm the target Atelier-Kit release or checkout.
3. Review preserve rules and bespoke extensions.
4. Require a clean/recoverable Git state or equivalent backup.
5. Run `site:upgrade --dry-run`.
6. Resolve preflight, preserve, dependency or manual-review blockers.
7. Apply `site:upgrade`.
8. Install dependencies when the plan says dependency installation is required.
9. Run validation and build checks.
10. Hand off remaining deployment or publication work according to the service scope.

The lifecycle MAY stop before mutation when deterministic non-destructive
upgrade cannot be established.

## Preflight and dry-run

Preflight and dry-run are part of the supported upgrade contract.

The tool rejects unsafe path conditions such as symbolic links in inspected
trees or invalid client paths.

Dry run MUST NOT mutate the target site.

Dry run SHOULD be used before applying maintenance upgrades, especially when a
site has preserve rules, custom code, dependency drift, or an old applied Kit
version.

A dry run result is a plan, not a guarantee that deployment will succeed.

## Mutation and dependency synchronization

`site:upgrade` performs local repository file mutation only after preflight,
planning and confirmation.

Managed file mutation is scoped to the upgrade plan.

The tool synchronizes only the finite Kit-owned runtime dependency requirements
required by managed source.

This synchronization MUST NOT be described as a generic dependency migration
system.

If `package.json` is preserved, required Kit dependency state must already match
the expected state or preflight stops before target mutation.

## Post-upgrade validation

After applying an upgrade, the maintainer SHOULD run the checks appropriate to
the change and customer scope.

For normal code-bearing upgrades:

```bash
npm install
npm run check
npm run build
```

Where content contracts may be affected:

```bash
npm run content:validate
```

For broader repository verification:

```bash
npm test
```

A maintenance report MUST distinguish checks that were actually run from checks
that were not run.

## Deployment/handoff boundary

A successful local upgrade is not the same as a successful deployment.

`site:upgrade` changes files in the customer repository working tree. It does
not roll back a live deployment, hosting project, DNS state, third-party service
state, cached build, published artifact, or customer account configuration.

Publication or deployment may require separate validation, recovery or rollback
steps. Those steps are in scope only when the maintenance relationship includes
deployment support or a separate managed-service agreement covers them.

## Compatibility and versioning policy

Atelier-Kit does not promise generic backward compatibility.

Compatibility guarantees exist only for explicitly documented and verified
boundaries.

Normal maintenance support covers:

- the current released minor line;
- the immediately previous released minor line.

Older releases are unsupported for normal maintenance and may require a
separately scoped migration before normal maintenance resumes.

## Migration policy

Automatic migration exists only where Atelier-Kit explicitly implements and
tests it.

Other migrations require documented release instructions and may require manual
work.

This contract does not imply a generic schema migration framework.

Large archive migration, incompatible legacy adaptation, custom extension
adaptation and extraordinary recovery are bespoke work unless separately
contracted.

## Backup, failure and recovery expectations

Before maintenance starts, the customer site MUST have a clean/recoverable Git
state or an equivalent backup.

`site:upgrade` has a local transaction rollback boundary for its planned
mutations.

Local transaction rollback is not deployment rollback.

Local rollback does not restore an already-published deployment, DNS change,
hosting configuration, third-party state, account setting or external service
behavior.

## Security and dependency responsibilities

GiadaWare owns remediation of Atelier-Kit core and Kit-managed dependency
requirements within the contracted supported version.

Security remediation targets the current supported release.

Backporting to the previous supported minor line is best-effort only when
technically reasonable and covered by the maintenance relationship.

There is no blanket backport promise.

Customer-owned accounts, credentials, infrastructure, domains, repositories,
hosting projects, billing relationships and third-party services remain the
customer's responsibility unless a separate managed-service agreement explicitly
assigns them to GiadaWare.

Third-party availability and behavior cannot be guaranteed by Atelier-Kit.

## Supported versions and end of support

Normal maintenance support covers the current released minor line and the
immediately previous released minor line.

Consumers outside that supported version window must first migrate to a
supported path before normal maintenance resumes.

Unsupported releases MAY be reviewed for a separately scoped migration,
recovery, adaptation or rebuild.

Extraordinary recovery, migration or adaptation for unsupported releases is
bespoke work unless separately contracted.

## Refusal/manual-review conditions

Normal upgrade may stop, require manual review, or be refused when deterministic
non-destructive upgrade cannot be established.

Typical conditions include:

- unsupported versions;
- unsafe filesystem or path conditions;
- incompatible preserve rules;
- preserved core-managed paths;
- unrecognized or customized Vite configuration;
- incompatible required dependency state;
- bespoke extensions requiring adaptation;
- missing authority, access or prerequisites;
- unrecoverable working tree or backup state;
- deployment or third-party conditions preventing safe handoff.

When normal upgrade stops, the next step SHOULD be a scoped diagnosis and
written remediation path, not blind mutation.

## Non-goals

This contract does not provide:

- indefinite support;
- generic backward compatibility;
- automatic migration for every release;
- a generic schema migration framework;
- maintenance of customer-owned infrastructure by default;
- guaranteed third-party availability;
- blanket security backports;
- deployment rollback through `site:upgrade`;
- conversion of bespoke customer extensions into core Kit obligations;
- ordinary maintenance for heavily customized forks.

## Related documentation

- `docs/product/service-package.md`
- `docs/product/operator-handoff-playbook.md`
- `docs/usage/client-scaffold.md`
- `docs/usage/customization.md`
- `docs/usage/deploy-vercel.md`
- `docs/usage/studio.md`
- `scripts/site-upgrade.js`
