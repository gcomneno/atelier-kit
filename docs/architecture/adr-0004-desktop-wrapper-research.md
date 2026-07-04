# ADR 0004: Desktop wrapper research

## Status

Accepted (phase 1 implemented)

## Context

Epic [#35](https://github.com/gcomneno/atelier-kit/issues/35) Phase 4 requires reducing terminal use for non-technical clients.

Issue [#41](https://github.com/gcomneno/atelier-kit/issues/41) tracks a desktop wrapper.

## Decision

Use a **phased approach**:

### Phase 1 — Studio launch helper (now)

Command:

```bash
npm run studio:launch
```

This script:

- starts localhost dev mode with `ATELIER_STUDIO=1`;
- opens the browser on `/studio`;
- keeps the same file-based architecture.

It does not hide the terminal completely, but removes manual URL copy/paste after the first `npm install`.

### Phase 2 — Tauri wrapper (later)

Package the studio + preview + publish prep in a small desktop app:

- local-only file writes;
- embedded browser or webview;
- bundled Node runtime or prebuilt publish checks;
- no hosted multi-tenant backend.

**Recommendation:** Tauri over Electron for smaller bundle size and better fit with a local-first tool.

### Non-goals

- hosted SaaS editor;
- replacing YAML as source of truth;
- auto-updater until a stable release cadence exists.

## Consequences

Phase 1 is enough for assisted client handoff today. Phase 2 becomes worthwhile after repeated client setups justify packaging cost.

## Related docs

- [`adr-0003-publishing-and-service-model.md`](adr-0003-publishing-and-service-model.md)
- [`studio.md`](../usage/studio.md)
