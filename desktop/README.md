# Atelier Desktop (terminal-free packaging)

Phase 2 packaging for epic [#52](https://github.com/gcomneno/atelier-kit/issues/52).

## Current status

**Phase 1 (shipped):** `npm run studio:launch` opens the local studio in the browser without manual URL copy/paste.

**Phase 1.5 (shipped):** `/studio/readiness` includes **Run publish prep** — validation, Content Doctor, check and build from the studio UI (no terminal for the operator during day-to-day edits).

**Phase 2 (planned):** Tauri desktop wrapper — see [spike doc](../docs/architecture/spike-tauri-desktop-phase2.md).

## Operator workflow today

1. Scaffold or hand off the client site folder.
2. Client runs `npm run studio:launch` (or operator starts it during maintenance).
3. Client edits content in `/studio/*`.
4. Client opens **Publish readiness** and clicks **Run publish prep** before deploy.
5. Operator runs `npm run publish -- --deploy` or uses Vercel until in-app deploy exists.

## Desktop MVP (future)

The `desktop/` Tauri project will:

- pick the site folder;
- start the dev server with `ATELIER_STUDIO=1`;
- open `/studio` in a native webview;
- expose publish prep and upgrade actions without a visible terminal.

Track progress on issue #52.
