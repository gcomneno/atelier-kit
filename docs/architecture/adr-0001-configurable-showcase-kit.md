# ADR 0001: Configurable showcase kit

## Status

Accepted

## Context

Atelier-Kit is a lightweight configurable showcase kit for makers, artists, artisans and small creative activities.

It is not intended to be a full e-commerce platform, social network, CRM, marketplace or contact-form lead funnel.

The first version should remain simple, deployable and understandable.

## Decision

Atelier-Kit 1.0 will be a SvelteKit template driven by configuration and structured content.

The first abstraction boundary is configuration, not multi-tenancy.

The application should be able to present different kinds of handcrafted items by changing YAML configuration files and item content, without rewriting Svelte components.

## Product boundaries

Atelier-Kit 1.0 includes:

- configurable site identity;
- configurable catalog vocabulary;
- item pages;
- structured item metadata;
- static images;
- configurable Signal Clouds;
- local browser state for selected signals.

Atelier-Kit 1.0 excludes:

- payments;
- cart;
- checkout;
- user accounts;
- public comments;
- contact forms;
- email collection;
- database-backed analytics;
- admin dashboard;
- multi-tenant SaaS features.

## Signal Clouds

Signal Clouds are configurable word-cloud-style questions shown on item pages.

Rules:

- one cloud represents one question;
- each cloud is always single-choice;
- visitors may change their answer;
- changing an answer replaces the previous local selection;
- multiple-choice clouds are intentionally out of scope;
- no public counters are shown;
- no comments are collected;
- no personal data is collected.

## Configuration

YAML is the preferred format for human-editable configuration.

Initial configuration files:

- config/site.yaml
- config/catalog.yaml
- config/signal-clouds.yaml

Item content lives in:

- content/items/

Images live in:

- static/images/items/

## Success criteria

Atelier-Kit becomes credible when the same codebase can support at least two different showcase identities by changing configuration and content only.
