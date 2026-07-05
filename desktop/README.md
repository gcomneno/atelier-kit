# Atelier Desktop

Tauri 2 wrapper for local Atelier-Kit client sites ([#60](https://github.com/gcomneno/atelier-kit/issues/60)).

Hides the terminal for day-to-day maintenance: pick a site folder, start the dev server and open `/studio` in a native window.

## Prerequisites

### All platforms

- [Node.js](https://nodejs.org/) 20+ and npm (client site must have run `npm install` once)
- [Rust](https://rustup.rs/) stable (`rustup default stable`)

### Linux (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  pkg-config
```

See [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux).

### macOS

```bash
xcode-select --install
```

See [Tauri macOS prerequisites](https://v2.tauri.app/start/prerequisites/#macos).

### Windows

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually preinstalled on Windows 11)

See [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows).

## Development

From the **atelier-kit** repository root:

```bash
cd desktop
npm install
npm run tauri dev
```

**Do not** open `http://localhost:1420` in a normal browser (`npm run dev` alone). The UI needs the Tauri webview to call the Rust backend (`invoke`). In a browser you will see `Cannot read properties of undefined (reading 'invoke')`.

The shell window opens on port `1420`. Choose a client site folder (e.g. `../luna-argento`) and click **Open studio**.

## Production build

```bash
cd desktop
npm run tauri build
```

### Linux output

- Binary: `src-tauri/target/release/atelier-desktop`
- AppImage: `src-tauri/target/release/bundle/appimage/atelier-desktop_0.1.0_amd64.AppImage`
- `.deb`: `src-tauri/target/release/bundle/deb/`

### macOS output

- `.app` and `.dmg` under `src-tauri/target/release/bundle/dmg/`

### Windows output

- `.msi` and `.exe` under `src-tauri/target/release/bundle/msi/` and `nsis/`

Ship the bundle appropriate for the client OS during operator handoff.

## Client workflow

1. Operator scaffolds the site, runs first deploy and installs dependencies (`npm install`).
2. Operator installs **Atelier Desktop** on the client machine (or ships an AppImage / installer).
3. Client opens Atelier Desktop → **Choose site folder** → selects their project folder.
4. Client clicks **Open studio** — dev server starts with `ATELIER_STUDIO=1` on `127.0.0.1:5173`.
5. Studio opens at `http://127.0.0.1:5173/studio` in a dedicated window.
6. **Open preview** shows the public site at `/` in the default browser.
7. **Publish live** remains in `/studio/readiness` inside the studio webview (Git + Vercel).

### System tray

Right-click the tray icon:

- **Open site folder** — reveal project files in the file manager
- **Open preview** — public site in browser
- **Stop dev server** — stop `npm run dev`
- **Quit**

The last chosen site folder is remembered between sessions.

## Technical notes

Matches `scripts/studio-launch.js`:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
# env: ATELIER_STUDIO=1
```

Validates `config/site.yaml` before starting.

## Out of scope (v0.1.0)

- Bundled Node.js runtime
- Auto-updater
- In-app Vercel OAuth

## Related

- [ADR 0004 Phase 2](../docs/architecture/adr-0004-desktop-wrapper-research.md)
- [Spike doc](../docs/architecture/spike-tauri-desktop-phase2.md)
- [Operator handoff playbook](../docs/product/operator-handoff-playbook.md)
