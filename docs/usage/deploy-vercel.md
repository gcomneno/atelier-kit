# Deploy to Vercel

Atelier-Kit is configured to use the Vercel adapter.

It does not require a database in version 1.0.

## Pre-deploy checklist

Run locally:

```bash
npm run publish
```

Or step by step:

```bash
npm run content:validate
npm run content:doctor
npm run check
npm run build
```

Review content:

- `config/site.yaml`
- `config/catalog.yaml`
- `config/signal-clouds.yaml`
- `content/items/`
- `static/images/items/`

Make sure:

- demo notices are removed or intentionally kept;
- every item image exists;
- every item page opens;
- Signal Cloud labels are final enough to publish;
- the repository visibility matches your intent.

## Local production preview

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

## Deploy with Vercel CLI

First deploy:

```bash
npx vercel
```

Production deploy:

```bash
npm run publish -- --deploy
```

Or manually:

```bash
npx vercel --prod
```

## Vercel project settings

Usually no custom settings are required.

Default expectations:

- framework: SvelteKit;
- install command: `npm install` or `npm ci`;
- build command: `npm run build`;
- output handled by `@sveltejs/adapter-vercel`.

## Public Visitor demo deployment

The public Atelier-Kit demo is a dedicated Visitor deployment, not a variant
of the private Hosted Studio project:

| Deployment | Vercel project | Purpose |
| --- | --- | --- |
| Public Visitor demo | `atelier-kit-visitor-demo` | Read-only Atelier-Kit default demo content |
| Private Hosted Studio | `atelier-kit-hosted-studio` | Explicitly configured private authoring only |

The public production URL is
<https://atelier-kit-visitor-demo.vercel.app>. It deploys this canonical
Atelier-Kit checkout in default Visitor runtime, using the default content in
`config/`, `content/`, and `static/`. Do not substitute client content merely
to perform a deployment or security audit: this project is also the usable
Atelier-Kit showcase.

Do not add `ATELIER_STUDIO_MODE`, `ATELIER_STUDIO_PRIVATE_POC`, or any Hosted
OAuth, authorization, state-store, or repository variable to this project.
Those settings belong only to the separate private Hosted Studio deployment.
No application environment variables are required for the Visitor demo.

### Reproducible live audit

After every production deployment, run this audit from any checkout. Every
Vercel command names the audited project explicitly, so it does not depend on
an ignored local `.vercel` link. The environment command lists names only,
never values: an empty result is limited to environment variables visible to
the auditing credentials and cannot prove the absence of unrelated Vercel
settings, integrations, source connections, or runtime defaults.

The HTTP assertions do not use a cookie jar, do not print response headers or
bodies, and remove their temporary public-response files on exit. The complete
audit runs in a subshell so strict shell options, functions, variables, and the
cleanup trap do not persist in an interactive caller.

```bash
(
  set -eu
  project='atelier-kit-visitor-demo'
  scope='giadaware'
  base_url='https://atelier-kit-visitor-demo.vercel.app'
  npx vercel@58.9.4 project inspect "$project" --scope "$scope"
  npx vercel@58.9.4 env ls --project "$project" --scope "$scope"

  audit_dir="$(mktemp -d)"
  trap 'rm -rf "$audit_dir"' EXIT

  audit_get() {
    label="$1"; route="$2"; expected="$3"
    headers="$audit_dir/$label.headers"; body="$audit_dir/$label.body"
    status="$(curl --silent --show-error --location --max-redirs 0 \
      --request GET --dump-header "$headers" --output "$body" \
      --write-out '%{http_code}' "$base_url$route")"
    test "$status" = "$expected"
    ! rg --ignore-case --quiet '^(location|set-cookie):' "$headers"
    printf 'PASS GET %s: %s; no Location or Set-Cookie\n' "$route" "$status"
  }

  audit_post_denied() {
    label="$1"; route="$2"
    headers="$audit_dir/$label.headers"; body="$audit_dir/$label.body"
    status="$(curl --silent --show-error --location --max-redirs 0 \
      --request POST --header "Origin: $base_url" \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data 'csrfToken=visitor-audit' --dump-header "$headers" \
      --output "$body" --write-out '%{http_code}' "$base_url$route")"
    test "$status" = 404
    ! rg --ignore-case --quiet '^(location|set-cookie):' "$headers"
    printf 'PASS POST %s: 404; no Location or Set-Cookie\n' "$route"
  }

  audit_get home / 200
  rg --fixed-strings --quiet '<title>Atelier-Kit Demo</title>' "$audit_dir/home.body"
  rg --fixed-strings --quiet 'Demo content. Replace these items with your own creations.' \
    "$audit_dir/home.body"
  printf 'PASS /: default Atelier-Kit Demo title and demo notice\n'

  for route in /about /catalog /collections /news /faq; do
    audit_get "public${route//\//_}" "$route" 200
  done
  for route in /studio /studio/site/social /auth/github/login /auth/github/callback; do
    audit_get "denied${route//\//_}" "$route" 404
  done
  audit_post_denied logout /auth/logout
  audit_post_denied social /studio/site/social
)
```

The procedure proves a representative default-content/page-identity response,
no OAuth redirect, and no `Set-Cookie` response transport on every denied GET
or POST route, including canonical-Origin `POST /studio/site/social`.

### Historical evidence, not rerun in this worktree

The issue #281 record dated 2026-08-12 says the public routes returned 200
with the shipped `Atelier-Kit Demo` content and the denied routes returned
404. It predates this corrected assertion script and was not rerun here
because live Vercel access was unavailable. Treat it as historical evidence,
not a claim about the current deployment; repeat the commands above after the
next deployment. See the [threat model](../security/hosted-studio-threat-model.md)
for the boundary interpretation.

## Privacy note

Atelier-Kit 1.0 stores Signal Cloud selections only in the visitor browser through `localStorage`.

No server-side signal database is created by this template.
