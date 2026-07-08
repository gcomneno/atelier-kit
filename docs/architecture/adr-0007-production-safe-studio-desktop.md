# ADR 0007: Production-safe studio authoring (Atelier Desktop)

## Status

Accepted — closes micro-CMS issue [#67](https://github.com/gcomneno/atelier-kit/issues/67)

## Context

Micro-CMS epic Tier 1 requires a credible **browser-accessible authoring** path for non-technical clients, without exposing unauthenticated write APIs on the public site.

Issue [#67](https://github.com/gcomneno/atelier-kit/issues/67) proposed two directions:

| Path | Summary |
|---|---|
| **A — Hosted studio** | Enable `/studio` on production with minimal auth (single-operator secret, no role system) |
| **B — Atelier Desktop** | Tauri app as the default client surface; production site stays read-only |

Atelier-Kit already ships:

- a full **Studio** UI in the SvelteKit app (`/studio/**`);
- **production gating** via `guardStudio()` — write routes return 404 unless `dev` or `ATELIER_STUDIO=1`;
- **Atelier Desktop** in `desktop/` (Tauri 2) — picks a site folder, starts localhost dev with `ATELIER_STUDIO=1`, opens `/studio` in a webview ([#60](https://github.com/gcomneno/atelier-kit/issues/60), ADR 0004 Phase 2).

Path A would add hosted auth, session or secret management on Vercel, and operational risk of a public write surface. Path B reuses existing studio code and keeps the live site strictly read-only.

## Decision

**Choose Path B: Atelier Desktop as the primary client authoring surface.**

Production deployments (Vercel, static adapter) **must not** enable studio write routes. Clients edit content through **Atelier Desktop** or, for operators, `npm run studio:launch` on localhost.

Path A (hosted studio with auth) is **deferred**. It may be revisited if a client cannot run Desktop or Node locally; it is not required for the micro-CMS Tier 1 contract when operator handoff includes Desktop.

## Security model

| Question | Answer |
|---|---|
| **Who can write?** | The person with the site folder on their machine and a running local studio session (Desktop or `studio:launch`). Single-operator; no multi-user roles. |
| **When can they write?** | While the local dev server runs with `ATELIER_STUDIO=1` on `127.0.0.1`. |
| **Where does writing happen?** | Localhost only. Files under `config/`, `content/`, and approved `static/images/` paths. |
| **What is public?** | The deployed site is read-only. `/studio` and all studio form actions return **404** in production builds when `ATELIER_STUDIO` is not set (and it must never be set on Vercel). |
| **What protects production?** | `src/lib/server/studio-guard.js` — `isStudioEnabled()` is true only in `dev` or when `ATELIER_STUDIO=1`. No open write endpoint on the live URL. |

```mermaid
flowchart LR
  subgraph client [Client machine]
    Desktop[Atelier Desktop]
    LocalDev[localhost:5173 ATELIER_STUDIO=1]
    YAML[config/ content/ static/images/]
    Desktop --> LocalDev
    LocalDev --> StudioUI[/studio UI]
    StudioUI --> YAML
  end

  subgraph public [Production Vercel]
    Site[Visitor routes read-only]
    Guard[guardStudio 404 on /studio]
    Site --- Guard
  end

  YAML -->|git push + deploy| Site
```

## What the client can edit (without YAML)

Through Desktop → Studio:

- site identity, appearance, hero, layout, contact, social, footer;
- about page;
- catalog labels and fields;
- items (including photo upload);
- collections;
- news posts;
- Signal Clouds;
- publish readiness (Content Doctor).

No manual YAML or separate dev-server setup is required from the client when using Desktop (operator runs `npm install` once during handoff).

## Consequences

**Positive:**

- Live site stays read-only; no hosted write attack surface.
- Reuses 100% of existing Studio UI and validation.
- Desktop already implemented; handoff docs cover shipping installers.

**Negative:**

- Client needs Desktop (or terminal `studio:launch`) and Node on their machine.
- Not “edit from any browser tab on the public URL” — editing is local-first by design.
- Path A remains future work if local install is impossible.

## Related docs

- [`adr-0002-local-studio-research.md`](adr-0002-local-studio-research.md) — studio architecture
- [`adr-0004-desktop-wrapper-research.md`](adr-0004-desktop-wrapper-research.md) — Desktop phases
- [`../usage/studio.md`](../usage/studio.md) — access rules and Desktop workflow
- [`../product/operator-handoff-playbook.md`](../product/operator-handoff-playbook.md) — client handoff
- [`../../desktop/README.md`](../../desktop/README.md) — build and ship Desktop
