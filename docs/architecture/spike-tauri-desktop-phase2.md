# Spike: Tauri desktop wrapper (ADR 0004 Phase 2)

Research spike for epic [#52](https://github.com/gcomneno/atelier-kit/issues/52) / issue [#53](https://github.com/gcomneno/atelier-kit/issues/53).

## Goal

Package Atelier-Kit studio + preview + publish prep so a non-technical client can maintain a site **without opening a terminal**.

Phase 1 (`npm run studio:launch`) already removes URL copy/paste. Phase 2 hides the terminal entirely.

## Recommendation

Use **Tauri 2** (not Electron) for:

- smaller download size;
- native webview instead of bundled Chromium;
- good fit for a local-first, single-folder tool;
- Rust backend can spawn existing Node scripts safely.

## Proposed architecture

```text
┌─────────────────────────────────────┐
│  Atelier Desktop (Tauri shell)      │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ Webview     │  │ Tray / menu   │ │
│  │ localhost   │  │ Open folder   │ │
│  │ /studio     │  │ Publish prep  │ │
│  └─────────────┘  └───────────────┘ │
└──────────────┬──────────────────────┘
               │ spawn
               ▼
   npm run dev (ATELIER_STUDIO=1)
   npm run publish
   site folder on disk (unchanged)
```

### Components

| Piece | Responsibility |
|---|---|
| Tauri app | Pick site folder, start/stop dev server, open webview |
| Existing SvelteKit app | Studio UI (no rewrite) |
| Node sidecar or system Node | Run `npm run publish`, `site:upgrade` |
| Site folder | Same YAML + static files as today |

### User flow (target)

1. Client opens **Atelier Desktop**.
2. Chooses existing site folder (or operator-preconfigured path).
3. App starts localhost studio and opens `/studio`.
4. **Preview** opens `/` in a second tab or split view.
5. **Publish** runs `npm run publish` and shows doctor output in-app.
6. Deploy to Vercel remains operator-assisted or a future guided step.

## Prototype scope (MVP)

Minimum spike to validate feasibility:

- [x] Tauri project in `desktop/` subdirectory
- [x] Folder picker → verify `config/site.yaml` exists
- [x] Spawn `npm run studio:launch` equivalent (dev + `ATELIER_STUDIO=1`)
- [x] Webview navigates to `http://127.0.0.1:5173/studio`
- [x] System tray: open folder, preview, stop server, quit
- [x] Document build targets: Linux, macOS, Windows

Out of spike MVP:

- Bundled Node runtime (assume Node installed for v1)
- Auto-updater
- In-app Vercel OAuth deploy

## Distribution (operator path)

1. Operator scaffolds client site and completes first deploy.
2. Operator installs Atelier Desktop on client machine (or ships `.AppImage` / `.dmg`).
3. Handoff doc points client to Desktop instead of terminal commands.
4. Kit upgrades: operator runs `site:upgrade` during maintenance sessions until in-app upgrade exists.

## Risks

| Risk | Mitigation |
|---|---|
| Node still required on client machine | Phase 2b: bundle Node or prebuild publish checks |
| Dev server lifecycle crashes | Tauri supervises process; restart button |
| Security of local file writes | Same trust model as studio today — local only |
| Maintenance cost of second app | Keep shell thin; all logic stays in kit |

## Next steps

1. Create `desktop/` Tauri scaffold with folder picker + webview.
2. Validate on Linux (primary dev environment).
3. Decide Node bundling vs documented prerequisite.
4. Update ADR 0004 when MVP spike passes.

## Related

- [`adr-0004-desktop-wrapper-research.md`](adr-0004-desktop-wrapper-research.md)
- [`operator-handoff-playbook.md`](../product/operator-handoff-playbook.md)
- [`studio.md`](../usage/studio.md)
