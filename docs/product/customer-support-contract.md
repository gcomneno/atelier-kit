# Customer support contract

## Purpose and scope

This document defines the customer support contract for Atelier-Kit sites when
support is explicitly included by commercial agreement, onboarding scope or
handoff.

It defines service obligations and boundaries. It does not define prices,
permanent commercial tiers, maintenance work, bespoke work, uptime commitments
or resolution guarantees.

Pricing and economics remain separate from this contract.

## Support principles

Support means diagnosis, classification, explanation and guidance.

Support MUST remain bounded by the supported Atelier-Kit product, the purchased
or included coverage, and the ownership boundaries recorded at handoff.

Support MUST NOT be treated as an implicit promise of:

- 24/7 availability;
- continuous monitoring;
- emergency standby;
- live incident bridges;
- same-day resolution;
- unlimited content operations;
- uncontracted maintenance;
- uncontracted bespoke work;
- blanket responsibility for customer-owned infrastructure or accounts.

## Support vs maintenance vs bespoke work

Support means diagnosis, classification, explanation and guidance.

Maintenance means execution of covered fixes, upgrades or repairs within an
active maintenance relationship.

Bespoke work means custom development, adaptation, redesign, unsupported
migration, extraordinary recovery or work outside supported product boundaries.

Support triage SHOULD classify whether a request is support, maintenance or
bespoke work before remediation is assumed.

## Supported channels

Primary support is a written channel agreed during commercial agreement or
handoff, normally email.

GitHub MAY be used only for explicitly agreed repository-level technical work.

Security incidents MUST NOT use public channels.

Handoff MUST identify a private security escalation path.

## Service hours and availability

Normal support operates on Italian business days during Italian business hours.

Saturdays, Sundays and Italian public holidays are excluded.

There is no implicit 24/7, weekend, holiday, continuous-monitoring,
emergency-standby, live-incident-bridge or same-day-resolution commitment.

## Severity / priority definitions

Support requests SHOULD be classified by the highest applicable severity after
initial triage.

### P1 Critical

P1 Critical applies when a supported production site is unavailable because of
an Atelier-Kit-responsibility failure, a credible security incident, or a severe
integrity/data-loss condition inside GiadaWare responsibility.

### P2 High

P2 High applies when an important supported capability is unavailable with no
reasonable workaround.

### P3 Normal

P3 Normal applies to a bounded defect with workaround, a supported
content/configuration mistake, or an ordinary operational question.

### P4 Advisory

P4 Advisory applies to a question, improvement, feature request, consulting
request, or request that may become bespoke work.

## Target initial-response expectations

These are target initial-response expectations only:

| Priority | Target initial response |
| --- | --- |
| P1 Critical | Within 1 business day |
| P2 High | Within 2 business days |
| P3 Normal | Within 3 business days |
| P4 Advisory | Within 5 business days |

These targets MUST NOT be represented as resolution guarantees, SLAs, uptime
commitments or completion commitments.

## Diagnostic information required

Support reports SHOULD include:

- affected site/repository;
- Atelier-Kit version;
- expected behavior;
- observed behavior;
- approximate occurrence time;
- reproduction steps;
- relevant error output;
- recent changes.

Ordinary reports MUST NOT contain secrets, tokens, credentials, private keys,
session cookies, OAuth state, Redis credentials, provider tokens or account
passwords.

## Incident ownership and escalation

Support triage SHOULD classify ownership before remediation is assumed.

Ownership classification SHOULD identify whether the request concerns:

- Atelier-Kit core;
- contracted managed scope;
- customer-authored content or configuration;
- customer-owned repository, deployment, domain, account or infrastructure;
- third-party provider behavior;
- unsupported modification, fork or bespoke extension.

Escalation does not automatically convert a support request into maintenance or
bespoke work.

## Security incident handling

Credible security reports MUST escalate in priority.

Containment MAY precede complete root-cause analysis.

GiadaWare security responsibility applies only to Atelier-Kit core and
contracted managed scope.

Customer/provider-owned infrastructure and accounts retain existing ownership.

This support contract MUST NOT create blanket security responsibility beyond
the maintenance contract.

## Third-party service boundaries

Third-party outages involving GitHub, Vercel, Redis, DNS, email or another
provider are not automatically Atelier-Kit defects or unconditional GiadaWare
restoration obligations.

GiadaWare MAY diagnose, explain or help with supported workarounds.

Provider escalation follows account ownership or a separate managed-service
agreement.

## Customer content/configuration mistakes

Bounded diagnosis and guidance for supported customer-authored content or
configuration mistakes MAY be support.

Extensive repair, reconstruction, mass edits, recovery, adaptation or editorial
rewriting is maintenance or bespoke work depending on scope.

Support MUST NOT become unlimited content operations.

## Unsupported modifications and forks

Changes to product-managed internals, preserved core paths, incompatible forks
and bespoke extensions are not automatically ordinary support.

Adaptation, repair or recovery MAY require bespoke work.

## Relationship to maintenance and upgrades

Maintenance and upgrade obligations are defined canonically in
[`maintenance-and-upgrade-contract.md`](maintenance-and-upgrade-contract.md).

This document references that contract and MUST NOT redefine maintenance or
upgrade obligations.

## Supported versions / end of support

Ordinary support covers the current released Atelier-Kit minor line and the
immediately previous released minor line, consistently with the maintenance and
upgrade contract.

Unsupported versions do not receive indefinite ordinary support.

Initial triage MAY identify a supported migration path.

## Support handoff after onboarding

Handoff MUST record:

- support channel;
- purchased/included coverage;
- supported version;
- repository/deployment/account ownership;
- required report information;
- private security escalation path.

Support applies only when explicitly included by commercial agreement,
onboarding scope or handoff.

## Exclusions and bespoke-work boundary

The following are not ordinary support unless separately included:

- custom development;
- custom adaptation;
- redesign;
- unsupported migration;
- extraordinary recovery;
- extensive content repair or rewriting;
- mass content operations;
- repair of incompatible forks;
- adaptation of bespoke extensions;
- customer/provider-owned infrastructure administration;
- provider escalation outside account ownership or managed-service scope.

Requests outside supported product boundaries SHOULD be classified as bespoke
work before execution.

## Non-goals

This contract does not provide:

- prices or permanent commercial tiers;
- resolution guarantees;
- uptime commitments;
- completion commitments;
- implicit 24/7, weekend or holiday coverage;
- continuous monitoring;
- emergency standby;
- live incident bridges;
- same-day resolution;
- unlimited content operations;
- blanket security responsibility beyond the maintenance contract;
- unconditional restoration obligations for third-party outages;
- ordinary support for unsupported versions, incompatible forks or unsupported
  modifications.

## Related documentation

- [`service-package.md`](service-package.md)
- [`operator-handoff-playbook.md`](operator-handoff-playbook.md)
- [`maintenance-and-upgrade-contract.md`](maintenance-and-upgrade-contract.md)
- [`micro-cms-positioning.md`](micro-cms-positioning.md)
- [`../usage/studio.md`](../usage/studio.md)
- [`../usage/hosted-studio.md`](../usage/hosted-studio.md)
- [`../usage/deploy-vercel.md`](../usage/deploy-vercel.md)
- [`../security/hosted-studio-threat-model.md`](../security/hosted-studio-threat-model.md)
