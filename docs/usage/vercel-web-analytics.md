# Vercel Web Analytics

Atelier-Kit supports an optional, site-owned Vercel Web Analytics integration
for public Visitor routes.

It is disabled by default.

## Enable it

In Local Studio open **Showcase settings → Analytics** and enable
**Vercel Web Analytics**.

The saved configuration is:

```yaml
site:
  analytics:
    provider: vercel
    enabled: true
```

Disabling the setting removes `site.analytics` from `config/site.yaml`.
Existing sites without this key retain their previous behavior and require no
configuration migration.

## Vercel project setup

The Atelier-Kit setting alone is not sufficient.

Web Analytics must also be enabled in the Vercel project dashboard. Data
collection begins only after publishing a deployment that contains this
integration.

Traffic from before activation is not reconstructed.

## Visitor and Studio boundary

Analytics is initialized only for public Visitor routes.

A direct request to `/studio` or any `/studio/...` route does not initialize the
Analytics package.

If a client-side session begins on a Visitor route and later navigates into
Studio, the Vercel `beforeSend` boundary discards Studio events.

Enabling Visitor Analytics therefore does not make Local Studio, private Hosted
Studio, or Demo authoring analytics surfaces.

## Development and preview

The site-owned setting can exist during development and preview builds, but
production traffic collection requires the corresponding Vercel project
configuration and a deployed build.

Atelier-Kit validation and builds do not require Vercel deployment metadata.

## Scope

This integration covers the baseline Vercel Web Analytics traffic and page-view
use case.

Custom interaction events, Signal Cloud funnels, personally identifying event
payloads, and a generic analytics-provider/plugin architecture are outside this
feature.
