# Pricing and commercial economics

## Purpose and status

This document defines the initial commercial pricing model for Atelier-Kit.

It materializes issue #321 and maps pricing directly to the commercial packaging
already defined in [`service-package.md`](service-package.md).

The prices in this document are **initial commercial assumptions**. They are not
permanent price commitments. They MUST be validated against:

- actual delivery effort;
- actual maintenance and support burden;
- real third-party costs;
- customer willingness to pay;
- real sales and customer conversations.

Atelier-Kit core remains open-source under the MIT licence.

The customer pays for delivery, expertise and an operational outcome, not for
permission to use Atelier-Kit.

## Commercial model

Atelier-Kit uses **hybrid service-based pricing**.

The commercial structure is:

```text
Standard Launch
  + explicit one-time add-ons
  + optional recurring services
  + customer-owned or explicitly passed-through third-party costs
  + separately quoted bespoke work
```

The model is intentionally not:

- a software licence;
- subscription-only;
- usage-based;
- priced by vague feature counts;
- an artificial Bronze/Silver/Gold feature-tier system.

Recurring revenue exists only where GiadaWare takes on explicit continuing
obligations such as maintenance, support or managed Hosted operations.

A customer MAY complete a Standard Launch and have no mandatory recurring
GiadaWare fee after handoff.

## Pricing units

The initial pricing units are:

| Unit | Initial price | Commercial meaning |
| --- | ---: | --- |
| Standard Launch | EUR 590 one-time | Standard customer delivery and handoff |
| Additional initial item | EUR 25 per item | Initial population beyond the baseline 10 items |
| Additional initial collection | EUR 50 per collection | Initial population beyond the baseline one collection |
| Hosted Studio setup | EUR 240 one-time | Separate Hosted provisioning and validation |
| Hosted Studio management | EUR 19/month | Only when GiadaWare actually provides ongoing managed Hosted operations |
| Maintenance | EUR 240/year | Contracted maintenance relationship within the maintenance contract |
| Support | EUR 180/year | Contracted support coverage within the support contract |
| Bespoke work | EUR 55/hour | Separately scoped customer-specific work |
| Bespoke minimum | EUR 165 | Minimum commercial engagement for bespoke work |
| Bespoke day | EUR 400/day | Alternative unit for well-bounded day-sized bespoke work |

All amounts are initial commercial assumptions subject to validation.

Taxes, invoicing treatment and any legally required fiscal presentation are
outside this product-contract document and MUST be handled according to the
applicable commercial/legal context.

## Standard Launch

The Standard Launch price is initially:

> **EUR 590 one-time**

It corresponds to the standard delivery contract already defined by
`service-package.md`.

The baseline includes:

- one bounded intake/discovery step;
- customer project creation or preparation;
- initial supported Atelier-Kit configuration;
- supported appearance configuration;
- site identity, contact and metadata configuration;
- up to 10 initial items;
- up to one initial collection;
- ordinary preparation of substantially ready customer material;
- content/readiness validation;
- first production deployment;
- production smoke verification;
- agreed production URL connection;
- supported domain/DNS assistance where required;
- supported authoring workflow handoff;
- a 30-minute handoff session;
- one final bounded correction/review pass.

The Standard Launch price MUST NOT silently expand to include work that the
commercial package defines as optional, recurring or bespoke.

## Standard Launch economic floor

The initial internal economic assumption is:

> **EUR 45/hour minimum internal GiadaWare value**

This is an internal sustainability parameter, not the customer-facing hourly
price for bespoke work.

For pricing analysis:

```text
Standard Floor
  = (H_standard * R_internal)
  + C_direct
  + Risk_buffer
```

Where:

- `H_standard` is realistic standard delivery effort;
- `R_internal` is the minimum sustainable internal hourly value;
- `C_direct` is any direct GiadaWare cost attributable to delivery;
- `Risk_buffer` covers bounded coordination, included review work, ordinary
  uncertainty and non-billable delivery overhead.

The repository delivery baseline estimates a normal first launch at
approximately half a day to one operator day when customer material is
substantially ready.

For the initial commercial model, **one full 8-hour operator day** is used as
the prudent floor reference rather than the best-case half-day.

Initial calculation:

```text
8 hours * EUR 45/hour = EUR 360
EUR 360 + approximately 20% operating/risk buffer = approximately EUR 430
```

Therefore the initial Standard Launch sustainable price floor is:

> **approximately EUR 430**

The EUR 590 Standard Launch price is intentionally above that floor.

The floor MUST be recalibrated when real delivery data becomes available.

## Extra initial content

The Standard Launch baseline remains:

- up to 10 initial items;
- up to one collection.

Initial extra-content pricing is:

- **EUR 25 per additional initial item**;
- **EUR 50 per additional initial collection**.

These units cover ordinary population of substantially ready customer material.

They do not include:

- substantial copywriting;
- editorial reconstruction;
- translation;
- advanced image production;
- archive recovery;
- custom data migration.

Those requests require separate scope classification.

## Hosted Studio economics

Private Hosted Studio is optional and separate from the normal Visitor
deployment.

Initial setup price:

> **EUR 240 one-time**

This covers bounded Hosted provisioning and validation within the supported
Hosted Studio architecture.

Where GiadaWare also accepts an ongoing managed Hosted responsibility, the
initial management assumption is:

> **EUR 19/month**

Hosted management MUST be charged only when GiadaWare actually provides an
ongoing managed obligation.

The management price does not silently include:

- third-party infrastructure charges;
- arbitrary repository administration;
- unlimited support;
- bespoke Hosted changes;
- customer account ownership;
- provider charges absorbed by GiadaWare.

If the real Hosted operating burden proves materially higher than this
assumption, the price MUST be recalibrated rather than allowing the service to
become structurally loss-making.

## Maintenance economics

Initial maintenance pricing is:

> **EUR 240/year**

Maintenance applies only when explicitly contracted.

Its scope is governed by
[`maintenance-and-upgrade-contract.md`](maintenance-and-upgrade-contract.md).

The recurring fee exists because an active maintenance relationship creates
ongoing responsibilities and capacity requirements.

Maintenance does not silently include:

- indefinite historical-version support;
- unsupported migrations;
- heavily customized fork adaptation;
- extraordinary recovery;
- arbitrary customer infrastructure administration;
- bespoke extension maintenance;
- guaranteed third-party availability.

Such work remains separately scoped where appropriate.

## Support economics

Initial support pricing is:

> **EUR 180/year**

Support applies only when explicitly purchased or included by written
commercial agreement.

Its scope is governed by
[`customer-support-contract.md`](customer-support-contract.md).

The support fee purchases bounded access to diagnosis, classification,
explanation and guidance within that contract.

It does not purchase:

- unlimited operator hours;
- 24/7 availability;
- continuous monitoring;
- guaranteed resolution;
- same-day remediation;
- unlimited content operations;
- maintenance work;
- bespoke development.

Maintenance and support remain separate commercial obligations even when both
are purchased by the same customer.

The initial combined recurring amount is:

```text
EUR 240/year maintenance
+ EUR 180/year support
= EUR 420/year
```

Equivalent monthly comparison:

```text
EUR 35/month
```

This monthly equivalent is explanatory only; it does not redefine the initial
annual commercial units.

## Bespoke work

Bespoke work is outside the Standard Launch contract.

Initial bespoke rate:

> **EUR 55/hour**

Minimum bespoke engagement:

> **EUR 165**

This corresponds to a minimum three-hour commercial block and prevents small
custom requests from creating disproportionate estimation, coordination,
implementation and verification overhead.

For well-bounded day-sized work, the initial alternative unit is:

> **EUR 400/day**

Typical bespoke work includes:

- custom development;
- custom integrations;
- redesign beyond supported configuration;
- unsupported migrations;
- extraordinary recovery;
- substantial editorial reconstruction;
- incompatible fork adaptation;
- substantial consumer-specific implementation.

Bespoke work MUST be identified before execution.

A standard customer relationship MUST NOT cause bespoke work to be silently
discounted or absorbed into ordinary delivery, maintenance or support.

When work cannot be estimated responsibly without investigation, GiadaWare MAY
first quote a bounded discovery/diagnosis engagement.

## Third-party costs

Third-party costs are not implicitly included in Atelier-Kit prices.

Typical examples include:

- domain registration and renewal;
- hosting plan charges;
- Vercel paid features;
- Redis or other persistent infrastructure;
- email or external service charges;
- other customer-selected provider costs.

The default policy is:

> **customer-owned account -> customer pays provider directly**

Where practical, customer repositories, domains, hosting projects and external
accounts SHOULD remain customer-owned.

If GiadaWare exceptionally incurs a third-party cost on behalf of the customer,
that cost MUST be:

- explicitly identified;
- explicitly authorized;
- passed through or included according to the written quote;
- distinguishable from GiadaWare service pricing.

Third-party costs MUST NOT be silently absorbed.

A service may include a third-party cost only when the quote explicitly states
the included service, amount or commercial boundary.

## Discounts and exceptions

Discounts MUST NOT change scope.

A discount does not:

- increase included revisions;
- add Hosted Studio;
- add maintenance;
- add support;
- absorb third-party costs;
- convert bespoke work into Standard Launch work.

The initial ordinary discount policy is:

> **maximum 10% discount, without crossing the sustainable price floor**

For the EUR 590 Standard Launch:

```text
10% discount -> EUR 531
```

An exceptional early-customer or pilot discount MAY reach 20% only when it is
explicitly recorded as a GiadaWare commercial/product-validation investment.

For the EUR 590 Standard Launch:

```text
20% pilot discount -> EUR 472
```

That exceptional price remains above the current approximate EUR 430 Standard
Launch floor.

Any price below the sustainable floor MUST be treated as an explicit GiadaWare
investment or subsidy, not as evidence that the normal commercial price is
sustainable.

Bespoke work is not automatically discounted when Standard Launch is
discounted.

## Representative customer scenarios

### Scenario A: Creative Standard

Customer:

- creative professional or artisan;
- substantially ready source material;
- 8 initial items;
- one collection;
- ordinary public Visitor deployment;
- Local Studio or Atelier Desktop authoring;
- no Hosted Studio;
- no bespoke customization;
- no ongoing maintenance/support purchased.

Initial GiadaWare cost:

```text
Standard Launch = EUR 590
```

Mandatory recurring GiadaWare cost after handoff:

```text
EUR 0
```

Customer-owned domain, hosting or other provider costs remain separate.

This scenario demonstrates that Atelier-Kit customer ownership does not require
a mandatory GiadaWare subscription.

### Scenario B: Managed Creative

Customer:

- standard launch;
- up to 10 initial items;
- one collection;
- public Visitor deployment;
- private Hosted Studio;
- ongoing Hosted management;
- maintenance;
- support.

Initial first-year GiadaWare cost:

```text
Standard Launch                 EUR 590
Hosted Studio setup             EUR 240
Hosted management               EUR 228/year
Maintenance                     EUR 240/year
Support                         EUR 180/year
                               --------
First-year total              EUR 1,478
```

Following-year GiadaWare cost while all recurring services remain active:

```text
Hosted management               EUR 228/year
Maintenance                     EUR 240/year
Support                         EUR 180/year
                               --------
Recurring total                 EUR 648/year
```

Monthly equivalent:

```text
EUR 54/month
```

Third-party provider charges remain separate unless explicitly included in the
quote.

Bespoke/change requests remain separately quoted.

## Cost drivers to validate

The following assumptions MUST be measured against real delivery:

### One-time delivery

- discovery/intake effort;
- project bootstrap effort;
- configuration effort;
- content preparation effort;
- deployment and domain coordination;
- validation effort;
- handoff effort;
- included correction-pass effort.

### Recurring work

- maintenance frequency and actual upgrade effort;
- support request volume;
- average triage effort;
- customer coordination burden;
- Hosted operational burden;
- security and provider-management burden where contracted.

### Variable costs

- provider charges paid by GiadaWare;
- external service charges;
- payment/invoicing overhead where relevant;
- extraordinary deployment or infrastructure costs.

### Bespoke uncertainty

- estimation effort;
- custom implementation complexity;
- regression/upgrade impact;
- verification burden;
- long-term maintenance implications.

## Assumptions requiring market validation

Before these prices are treated as stable commercial policy, GiadaWare SHOULD
collect evidence about:

- actual median Standard Launch operator hours;
- best-case and worst-case standard delivery effort;
- frequency of scope expansion during onboarding;
- customer willingness to pay EUR 590 for Standard Launch;
- conversion impact of the price;
- actual Hosted Studio setup and recurring burden;
- actual annual maintenance effort per customer;
- actual annual support volume per customer;
- appropriateness of EUR 55/hour and EUR 400/day for bespoke work;
- whether extra-item and extra-collection pricing reflects real effort;
- whether 10% ordinary and 20% pilot discount limits are commercially useful;
- whether recurring services should remain separate or later be packaged
  together.

Real evidence MAY justify changing prices without changing the underlying
Atelier-Kit product contract.

## Commercial boundaries

Pricing MUST preserve the existing product boundaries.

Standard pricing MUST NOT be used to justify adding:

- ecommerce;
- visitor accounts;
- arbitrary page building;
- generic plugins;
- multi-tenant SaaS behavior;
- unsupported custom application behavior.

A request outside the supported product contract is either:

- a separately priced supported add-on;
- `BESPOKE REVIEW`;
- refused when it conflicts with security, ownership or product boundaries.

Commercial pressure MUST NOT silently redefine Atelier-Kit core.

## Customer-facing explanation

The pricing model should be explainable in plain language:

> Atelier-Kit has a one-time Standard Launch price for preparing, configuring,
> publishing and handing over your showcase. You own your content and, whenever
> practical, your domain, repository and hosting accounts. There is no mandatory
> subscription after handoff. Optional Hosted Studio, maintenance and support
> are priced separately when you want GiadaWare to keep providing those ongoing
> services. Custom work is quoted separately, and external provider costs remain
> yours unless a quote explicitly says otherwise.

## Success condition

The pricing proposal is usable when:

- pricing maps directly to the commercial package;
- one-time and recurring obligations are visibly separate;
- bespoke work cannot silently enter standard scope;
- third-party costs cannot be accidentally absorbed;
- the sustainable price floor is explicit;
- representative customer scenarios can be costed end-to-end;
- customers can understand the model without internal product knowledge;
- unvalidated assumptions remain explicitly identified.

## Related documentation

- [`service-package.md`](service-package.md)
- [`customer-onboarding-runbook.md`](customer-onboarding-runbook.md)
- [`maintenance-and-upgrade-contract.md`](maintenance-and-upgrade-contract.md)
- [`customer-support-contract.md`](customer-support-contract.md)
- [`micro-cms-positioning.md`](micro-cms-positioning.md)
