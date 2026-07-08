# Operator handoff playbook

Step-by-step checklist for delivering an Atelier-Kit client site from intake to handoff call.

Part of epic [#43](https://github.com/gcomneno/atelier-kit/issues/43). Complements [`service-package.md`](service-package.md) and ADR 0003.

Reference demo: [Luna Argento](https://luna-argento.vercel.app) — jewelry template, Italian copy, live Vercel deploy.

## Before you start

| Item | Notes |
|---|---|
| Atelier-Kit repo | Operator machine with Node 18+ |
| Client intake | Fill [`client-intake.md`](../client-intake.md) during or after the call |
| Template choice | See [`scaffold-templates.md`](../usage/scaffold-templates.md) |
| GitHub + Vercel | Optional at setup; required before deploy |

Typical total time: **half day to one day** (see timings below).

---

## Phase 1 — Intake and scaffold (30–60 min)

### 1.1 Intake call

Collect from the client:

- public site title and tagline
- language
- contact email and/or WhatsApp
- creative type (writing, artwork, handmade, jewelry, furniture)
- first item title and collection name
- whether they will maintain the site alone after handoff

Use [`client-intake.md`](../client-intake.md) as the worksheet.

### 1.2 Create the client folder

**Option A — Wizard (recommended when intake answers are ready):**

```bash
cd /path/to/atelier-kit
npm run site:wizard -- --yes \
  --template jewelry \
  --target ../client-site \
  --site-title "Luna Argento" \
  --tagline "Gioielli fatti a mano in argento" \
  --language it \
  --email studio@example.com \
  --first-item-title "Anello Onda" \
  --collection-title "Entità disponibili"
```

**Option B — Scaffold only:**

```bash
npm run site:scaffold -- ../client-site --template jewelry
cd ../client-site
npm install
```

**Option C — Manual setup:** see [`manual-client-setup.md`](../usage/manual-client-setup.md).

### 1.3 Verify structure

```bash
cd ../client-site
npm run content:validate
npm run item:validate
npm run check
```

Fix any structural errors before continuing.

---

## Phase 2 — Content and studio (1–3 h)

### 2.1 Open the studio

```bash
npm run studio:launch
```

Browser opens at `http://127.0.0.1:5173/studio`. Keep a **Preview** tab on `/` to check visitor pages.

### 2.2 Site settings (`/studio`)

- Site title, tagline, language, notice, footer
- **Site appearance** — background preset or custom colors
- Contact email / WhatsApp for Visitor Brief

### 2.3 About (`/studio/about`)

Replace starter copy with the client’s studio story.

### 2.4 Catalog (`/studio/catalog`)

Confirm item vocabulary (`piece` / `pieces`, `work` / `works`, etc.) and visible fields.

### 2.5 Items

- **Create:** `/studio/items/new` — id, title, preset, description, optional photo
- **Edit:** upload JPG/PNG/WebP; path updates automatically
- Target: every published item has a real photo and description (40+ characters)

### 2.6 Collections

- **Create:** `/studio/collections/new`
- **Edit:** title, description, included items

### 2.7 News (`/studio/news`)

- **Create:** `/studio/news/new` — title, date, excerpt, body
- **Edit:** update posts for writing-oriented showcases

### 2.8 Signal Clouds (`/studio/signal-clouds`)

Localize questions and answer labels for the client’s contact flow.

### 2.9 Publish readiness (`/studio/readiness`)

Run Content Doctor from the UI. Resolve warnings before deploy.

```bash
npm run content:doctor
npm run content:doctor -- --strict   # must pass before public launch
```

---

## Phase 3 — Review and deploy (30–45 min)

### 3.1 Publish prep

```bash
npm run publish
```

Runs validate, doctor, check and build.

### 3.2 Deploy to Vercel

```bash
npm run publish -- --deploy
```

Or use the deploy button in `DEPLOY.md` after pushing to GitHub.

See [`deploy-vercel.md`](../usage/deploy-vercel.md).

### 3.3 Post-deploy smoke test

- [ ] Homepage loads with correct title and tagline
- [ ] Item pages show photos and details
- [ ] Collections list and detail pages work
- [ ] About page reads correctly
- [ ] Signal Clouds + Visitor Brief produce a copyable message
- [ ] Contact email/WhatsApp links use real client details
- [ ] `/studio` returns 404 on production (expected — see [ADR 0007](../architecture/adr-0007-production-safe-studio-desktop.md))

---

## Phase 4 — Git and kit sync

### 4.1 Initialize client repository

```bash
cd ../client-site
git init
git add .
git commit -m "Initial client site"
git remote add origin git@github.com:YOUR_USER/client-site.git
git push -u origin main
```

### 4.2 Record kit source

Scaffold and `site:upgrade` write `.atelier-kit-source` pointing at the kit folder.

### 4.3 Future kit upgrades

When Atelier-Kit ships fixes or studio features:

```bash
cd ../client-site
npm run site:upgrade -- --from ../atelier-kit
npm run check
npm run build
npm run publish -- --deploy
```

See [`client-scaffold.md`](../usage/client-scaffold.md#upgrading-an-existing-client-site).

---

## Phase 5 — Handoff call (30 min)

Use this agenda with the client.

### 5.1 What they received

- Public URL (e.g. `https://client-site.vercel.app`)
- Git repository (if applicable)
- This checklist (copy the section below)

### 5.2 What they can change alone

| Task | How |
|---|---|
| Site text and colors | `/studio` → Site settings + Appearance |
| About page | `/studio/about` |
| Add or edit items | `/studio/items` + photo upload |
| Collections | `/studio/collections` |
| News posts | `/studio/news` |
| Visitor questions | `/studio/signal-clouds` |
| Check before publish | `/studio/readiness` |

### 5.3 What stays operator-only (for now)

- First deploy and Vercel account linking
- Kit upgrades (`site:upgrade`) — can be a paid update session
- Custom code or design outside Atelier-Kit templates

### 5.4 Local workflow recap

Tell the client:

1. Open the site folder on their computer.
2. **Option A — Atelier Desktop (recommended):** open Atelier Desktop, choose the site folder, click **Open studio**.
3. **Option B — Terminal:** run `npm run studio:launch`.
4. Edit in the browser; save writes to project files.
5. When ready to go online, use **Metti online** on `/studio/readiness` inside the studio (or run `npm run publish -- --deploy`).

Studio is **local only** — never exposed on the live site. Security model: [ADR 0007](../architecture/adr-0007-production-safe-studio-desktop.md).

### 5.5 Atelier Desktop handoff

For non-technical clients, ship the desktop app from `desktop/` after `npm run tauri build`:

| OS | Bundle to ship |
|---|---|
| Linux | `.AppImage` or `.deb` from `desktop/src-tauri/target/release/bundle/` |
| macOS | `.dmg` from `bundle/dmg/` |
| Windows | `.msi` or NSIS `.exe` from `bundle/msi/` or `bundle/nsis/` |

**Client machine must have:** Node.js 20+, npm, and `npm install` already run once in the site folder.

**First-time setup:**

1. Install Atelier Desktop (double-click installer or `chmod +x` AppImage).
2. Open the app → **Choose site folder** → select the handed-off project directory.
3. Click **Open studio** — no terminal required.

Build prerequisites for operators are documented in [`desktop/README.md`](../../desktop/README.md).

---

## Client checklist (copy for handoff)

Send this to the client after the call.

```markdown
# Your Atelier-Kit site — quick guide

**Live site:** [URL]

## Edit content on your computer

**With Atelier Desktop (no terminal):**

1. Open Atelier Desktop.
2. Choose your site folder.
3. Click **Open studio**.

**Or with the terminal:**

1. Open the project folder.
2. Run: npm run studio:launch
3. Browser opens at http://127.0.0.1:5173/studio

## What you can update

- Site name, tagline, colors, contact email/WhatsApp
- About page text
- Items (title, description, photo upload)
- Collections (which items belong together)
- News posts (title, date, excerpt, body)
- Visitor Brief questions

## Before going live after changes

Open **Pronto per pubblicare** in the studio and click **Metti online**, or run:

npm run publish -- --deploy

## Important

- The editing tool (Studio) works only on your computer, not on the public website.
- Keep backups: commit to Git or copy the folder before big changes.
- Photos are stored in static/images/items/

## Need help?

Contact [operator name/email] for deploy help or kit updates.
```

---

## Operator checklist (close the project)

- [ ] Intake brief filed
- [ ] Client folder scaffolded or wizard-run
- [ ] Real site identity, about, contact
- [ ] All items have photos and descriptions
- [ ] Collections reference valid item ids
- [ ] Signal Clouds match client language and intent
- [ ] `content:doctor --strict` passes
- [ ] `npm run publish` succeeds
- [ ] Production deploy verified
- [ ] Git repo pushed (if used)
- [ ] Client received URL + client checklist
- [ ] 30-minute handoff call completed

---

## Luna Argento reference

| Aspect | Value |
|---|---|
| Repo | https://github.com/gcomneno/luna-argento |
| Live | https://luna-argento.vercel.app |
| Template | `jewelry` |
| Language | Italian |
| Studio features used | items, collections, about, appearance, photos |

Use Luna Argento to demo studio flows during handoff calls.

---

## Related docs

- [`service-package.md`](service-package.md) — pricing and scope
- [`studio.md`](../usage/studio.md) — studio routes and access rules
- [`adr-0007-production-safe-studio-desktop.md`](../architecture/adr-0007-production-safe-studio-desktop.md) — authoring security model
- [`client-intake.md`](../client-intake.md) — intake worksheet
- [`deploy-vercel.md`](../usage/deploy-vercel.md) — Vercel setup
- [`content-doctor.md`](../usage/content-doctor.md) — publish readiness
