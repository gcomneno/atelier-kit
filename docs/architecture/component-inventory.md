# Svelte component inventory for possible `giada-ui` extraction

## Status

This is a preliminary inventory of the Svelte components present in Atelier-Kit at base commit `5ea2182`. It records observed APIs and coupling, then adds explicitly preliminary architectural assessments. It is not a decision to extract any component, does not define a package boundary, and is input for the future Phase 2 of epic #127.

The repository state contains **23** files matching `src/lib/components/*.svelte`. This inventory follows that real set rather than assuming that the list in issue #160 is complete.

## Executive summary

The main coupling families are visitor and Studio localization contexts; Atelier Mark/editorial text rendering; item, content, branding, layout, search, social and contact domain contracts; SvelteKit navigation/state; global visitor and Studio CSS tokens; and browser lifecycle/DOM APIs.

Difficulty totals:

- `low`: 4
- `medium`: 6
- `high`: 13

Preliminary classification totals:

- `generic-ui-primitive`: 3
- `reusable-giadaware-component`: 3
- `atelier-kit-application-component`: 9
- `studio-only-component`: 7
- `not-suitable-for-extraction`: 1

The safest candidates are the small head/metadata primitives (`JsonLd`, `PageSocialMeta`), the self-contained `SocialIcon`, and, with a naming/ownership decision, `StudioFormStatus`. Small size alone was not treated as evidence of genericity: for example, `KitCredit` is small but its purpose is Atelier-Kit attribution.

## Inventory method

Facts below were collected by listing `src/lib/components/*.svelte`, reading every matching file, searching the repository for filename imports/usages, inspecting component and module imports, public props, bindings, callbacks and markup, and searching tests/specs for direct component references. Styling assessment includes scoped rules, `:global(...)` selectors and every referenced CSS custom property. Browser APIs, lifecycle calls and `$app/*` imports were checked separately. “Direct consumer” means a repository file that imports the component (documentation/test mentions are not consumers).

Test coverage is described conservatively: a test that reads component source is “direct static-source”; tests of an imported helper or surrounding route data are “indirect”; otherwise coverage is “none identified.” No runtime component or visual test suite was found by the repository searches used for this inventory.

## Summary matrix

| Component | Responsibility | Main consumers | Principal coupling | Difficulty | Classification |
| --- | --- | --- | --- | --- | --- |
| `BookReading` | Render a news post as a book page | news detail | book parser, editorial markup, news model | high | `atelier-kit-application-component` |
| `CatalogSidebar` | Compose catalog/about/news/collection widgets | visitor listing pages | layout order, routes, visitor i18n, content models | high | `atelier-kit-application-component` |
| `EditorialText` | Render Atelier Mark inline editorial tokens | visitor pages and components, one Studio page | Atelier Mark parser and global mark classes | medium | `reusable-giadaware-component` |
| `ImageLightbox` | Dialog gallery with fit and navigation controls | item and news detail | visitor i18n, `<dialog>`, two-way props | medium | `reusable-giadaware-component` |
| `ItemCard` | Render linked catalog item cards | home, catalog, collection detail | item model, cover policy, routes, i18n | high | `atelier-kit-application-component` |
| `JsonLd` | Safely emit JSON-LD in the document head | about, FAQ, news detail | Svelte head only | low | `generic-ui-primitive` |
| `KitCredit` | Render Atelier-Kit attribution | footer and root layout | kit branding policy | medium | `not-suitable-for-extraction` |
| `MarkedTextField` | Studio editor and preview for Atelier Mark | many Studio editors | operator i18n, Atelier Mark, typography presets | high | `studio-only-component` |
| `MetaInfo` | Flatten and render nested item metadata | item detail | item metadata contract, visitor i18n | medium | `atelier-kit-application-component` |
| `PageSocialMeta` | Emit Open Graph/Twitter metadata | item and news detail | Svelte head | low | `generic-ui-primitive` |
| `SignalCloud` | Persist a visitor choice for an item | item detail | signal domain, localStorage/event protocol, i18n | high | `atelier-kit-application-component` |
| `SiteFooter` | Render configured footer, social links and credit | root layout | footer/social models, i18n, marked text, branding | high | `atelier-kit-application-component` |
| `SiteHeader` | Render branded navigation, search and social links | root layout | branding/search/social contracts and i18n | high | `atelier-kit-application-component` |
| `SiteSearch` | Filter and navigate visitor search results | `SiteHeader` | SvelteKit navigation, search model, i18n | high | `atelier-kit-application-component` |
| `SocialIcon` | Select an inline SVG by social network id | header and footer | fixed network-id set | low | `reusable-giadaware-component` |
| `StudioAccessGuide` | Explain Studio access/deployment workflow | Studio help | operator copy and deployment assumptions | high | `studio-only-component` |
| `StudioFieldLabel` | Standard Studio label/hint/required marker | many Studio forms | operator i18n and parent label semantics | medium | `studio-only-component` |
| `StudioFormLegend` | Explain required/optional Studio fields | most Studio forms | operator i18n | high | `studio-only-component` |
| `StudioFormStatus` | Auto-dismiss a form status message | most Studio forms | timer lifecycle only | low | `generic-ui-primitive` |
| `StudioItemGalleryFields` | Edit ordered item gallery rows | Studio item edit | item edit model, dirty-control contract, i18n | high | `studio-only-component` |
| `StudioItemMetaFields` | Edit ordered item metadata rows | Studio item edit | item edit model, dirty-control contract, i18n | high | `studio-only-component` |
| `StudioNav` | Render route-aware Studio navigation | Studio layout | `$app/state`, fixed Studio routes, i18n | high | `studio-only-component` |
| `VisitorBrief` | Build/copy/share an item-interest brief | item detail | contact/signal/item models, i18n, browser APIs | high | `atelier-kit-application-component` |

## Detailed component cards

### `BookReading.svelte`

- **Source:** `src/lib/components/BookReading.svelte`.
- **Responsibility:** renders a `NewsPost` body as a styled book page, mapping parsed block types to fixed semantic markup and linkifying CTA text.
- **Direct consumers:** `src/routes/news/[slug]/+page.svelte`.
- **Public props:** `post: { id, title, excerpt?, body }`; `backHref?: string` (default `/news`); required `backLabel: string`.
- **Events/callbacks/bindings/slots:** none.
- **Imported components:** `EditorialText`.
- **Imported modules:** `$lib/editorial-markup.js` (`splitEditorialParagraphs`), `$lib/book-content.js` (`parseBookContent`, `linkifyPlainText`). No `$app/*` dependency.
- **Domain/i18n/marked text:** hard-coded news-post shape and `/news` route; no i18n context because the label is supplied; title/excerpt use Atelier Mark through `EditorialText`, while body semantics depend on the Atelier-Kit book-content grammar.
- **CSS assumptions/tokens:** large, opinionated scoped book design; global `.book-series` styling reaches the child component. Uses `--site-text-color` and `--site-accent-color`; otherwise many fixed colors, spacing and typography assumptions.
- **Browser/lifecycle:** no lifecycle or explicit browser-only API; external CTA links use normal browser navigation.
- **Tests:** no direct component test identified; indirect coverage may exist for editorial/book helper behavior, but no component rendering assertion was found.
- **Assessment:** `high`; `atelier-kit-application-component`. It is a complete news-reading feature and content grammar renderer, not a presentation primitive. Extraction would require a generic block/renderer contract, injected navigation, and a decision about Atelier Mark ownership.

### `CatalogSidebar.svelte`

- **Source:** `src/lib/components/CatalogSidebar.svelte`.
- **Responsibility:** conditionally builds ordered sidebar widgets for about, news, collections and catalog items.
- **Direct consumers:** `src/routes/+page.svelte`, `src/routes/catalog/+page.svelte`, `src/routes/collections/+page.svelte`, `src/routes/collections/[id]/+page.svelte`.
- **Public props:** optional `collections`, `about`, `newsPosts`, `catalogItems`, `catalog`, `site` (default `{ language: 'en' }`), `blockLabels`, and `variant: 'light' | 'dark'` (default `light`), with the concrete shapes documented in the source typedefs.
- **Events/callbacks/bindings/slots:** none.
- **Imported components:** `EditorialText`.
- **Imported modules:** `$lib/editorial-markup.js`, `$lib/layout-blocks.js`, visitor i18n context. No `$app/*` import.
- **Domain/i18n/marked text:** depends on About, NewsPost, Collection and CatalogItem/CatalogConfig shapes, `LAYOUT_BLOCK_IDS`, fixed visitor routes, locale date formatting, visitor translation keys, and Atelier Mark for titles/descriptions.
- **CSS assumptions/tokens:** widget sizing and dark variant are internal; uses `--site-accent-color`, `--site-border-color`, `--site-card-color`, `--site-heading-color`, `--site-muted-text-color`, `--site-text-color`, plus component-local `--sidebar-*` variables (including overridable `--sidebar-widget-height`). Uses modern `:has()` and `color-mix()`.
- **Browser/lifecycle:** `Date`/`toLocaleDateString`; no client lifecycle.
- **Tests:** no direct component test identified; layout-block tests are only indirect coverage of one imported ordering contract.
- **Assessment:** `high`; `atelier-kit-application-component`. It composes multiple application features and route/data contracts. A reusable shell would need generic widget data or snippets, resolved labels and injected hrefs.

### `EditorialText.svelte`

- **Source:** `src/lib/components/EditorialText.svelte`.
- **Responsibility:** parses and renders Atelier Mark inline tokens, optional epigraph wrapping and a dynamic outer HTML element.
- **Direct consumers:** `BookReading`, `CatalogSidebar`, `ItemCard`, `MarkedTextField`, `SignalCloud`, `SiteFooter`, `SiteHeader`; visitor routes `+page`, about, catalog, collections list/detail, FAQ, item detail, news list/detail; Studio about page.
- **Public props:** `value?: string = ''`, `display?: { wrap?, quote_color? } | null`, `tag?: string = 'span'`, and `class?: string = ''`.
- **Events/callbacks/bindings/slots:** none.
- **Imported components:** none. **Modules:** `$lib/editorial-markup.js` parser/resolvers/classes. No `$app/*` or i18n dependency.
- **Domain/i18n/marked text:** directly owns Atelier Mark rendering semantics and class mapping; no item model or i18n context.
- **CSS assumptions/tokens:** emits global Atelier Mark classes and uses `:global(...)` rules, including interaction with global `.tagline`/`.hero-epigraph` conventions. Uses `--site-accent-color`, `--site-heading-color`, `--site-intro-title-color`, `--site-text-color`.
- **Browser/lifecycle:** none explicit.
- **Tests:** no direct test importing/rendering the component; `marked-text.test.js` statically asserts that `MarkedTextField` uses it, and editorial parser tests indirectly cover its core module.
- **Assessment:** `medium`; `reusable-giadaware-component`. It is reusable across Giadaware products only if Atelier Mark and its CSS contract intentionally cross the package boundary; otherwise accept a renderer/parser injection or move the format with the component.

### `ImageLightbox.svelte`

- **Source:** `src/lib/components/ImageLightbox.svelte`.
- **Responsibility:** normalizes a gallery, opens a modal `<dialog>`, switches image fit, and navigates images.
- **Direct consumers:** item detail and news detail routes.
- **Public props:** legacy `export let` props `open = false`, `src = ''`, `alt = ''`, `images: Array<{ file, alt?, role? }> = []`, `index = 0`. Consumer bindings make `open` and, where used, `index` two-way state.
- **Events/callbacks/bindings/slots:** mutates/binds `open` on close and `index` on previous/next; internal DOM `bind:this`; no callback, dispatched event or slot.
- **Imported components:** none. **Modules:** visitor i18n context only; no `$app/*`.
- **Domain/i18n/marked text:** image shape uses Atelier-Kit `file`/`alt`/`role` conventions; fit/close/counter labels use visitor i18n, but Previous/Next are currently literal English. No Atelier Mark.
- **CSS assumptions/tokens:** entirely scoped, fixed dark dialog palette, no global CSS variables. Assumes native `<dialog>` layout/backdrop and viewport units.
- **Browser/lifecycle:** strong DOM dependency: `document` guard, `HTMLDialogElement.showModal/close`, keyboard and click events. No `onMount`; reactive synchronization controls the dialog.
- **Tests:** no direct or clearly indirect component coverage identified.
- **Assessment:** `medium`; `reusable-giadaware-component`. The interaction is broadly reusable, but extraction should replace context lookup with supplied labels, define controlled/bindable state deliberately, genericize image `src` data, and test dialog focus/keyboard/accessibility behavior.

### `ItemCard.svelte`

- **Source:** `src/lib/components/ItemCard.svelte`.
- **Responsibility:** renders a linked, branded item card with cover fallback, Atelier Mark text, year/medium/dimensions metadata and visitor labels.
- **Direct consumers:** home, catalog and collection-detail routes.
- **Public props:** one untyped-at-boundary `item` object; markup assumes at least `id`, `title`, `description`, cover/image fields consumed by cover helpers, and optional `year`, `medium`, `dimensions`.
- **Events/callbacks/bindings/slots:** image `onerror` replaces the source with the resolved fallback and guards repeated fallback; no public callback, binding or slot.
- **Imported components:** `EditorialText`. **Modules:** `$lib/item-cover.js`, visitor i18n context, `$lib/editorial-markup.js`. No `$app/*`.
- **Domain/i18n/marked text:** fixed `/items/{id}` navigation; Atelier-Kit item and cover-resolution contracts; visitor translation keys for metadata; Atelier Mark title/description and paragraph splitting.
- **CSS assumptions/tokens:** strong card layout/aspect/hover conventions. Uses `--site-accent-color`, `--site-base-color`, `--site-border-color`, `--site-card-color`, `--site-heading-color`, `--site-muted-text-color`, `--site-text-color`; relies on global theme token ownership and `color-mix()`.
- **Browser/lifecycle:** browser image error handling; no lifecycle.
- **Tests:** no direct component test. Item-image helper tests are indirect and do not assert card rendering or fallback behavior.
- **Assessment:** `high`; `atelier-kit-application-component`. Despite being a candidate named in issue #160, it is a domain feature. Extraction would require a generic card model, injected href/cover policy and resolved labels, plus an Atelier Mark renderer/snippet and documented tokens.

### `JsonLd.svelte`

- **Source:** `src/lib/components/JsonLd.svelte`.
- **Responsibility:** serializes a record safely enough for inline JSON-LD and emits it in `<svelte:head>`.
- **Direct consumers:** about, FAQ and news-detail routes.
- **Public props:** required `data: Record<string, unknown>`.
- **Events/callbacks/bindings/slots:** none. **Imports:** none; no `$app/*`, domain, i18n or Atelier Mark dependency.
- **CSS assumptions/tokens:** none.
- **Browser/lifecycle:** Svelte head/SSR integration only; no direct DOM API. Escapes `<` and `>` after `JSON.stringify`.
- **Tests:** no direct or clearly indirect component test identified.
- **Assessment:** `low`; `generic-ui-primitive`. It is already data-agnostic and self-contained, subject to validating packaging/SSR behavior and serialization policy.

### `KitCredit.svelte`

- **Source:** `src/lib/components/KitCredit.svelte`.
- **Responsibility:** renders localized “built with Atelier Kit” attribution linked to the kit project.
- **Direct consumers:** `SiteFooter` and root layout.
- **Public props:** legacy `locale: string = 'en'`.
- **Events/callbacks/bindings/slots:** none. **Imports:** `$lib/kit-branding.js`; no component, `$app/*`, i18n context or Atelier Mark dependency.
- **Domain/i18n/marked text:** localization is delegated to kit-branding helpers/constants, not either context; its entire contract is Atelier-Kit brand identity.
- **CSS assumptions/tokens:** small scoped inline/link style; inherits color, no CSS variables.
- **Browser/lifecycle:** none.
- **Tests:** no component-specific test identified; `test/kit-version.test.js` concerns kit metadata and is at most indirect.
- **Assessment:** `medium`; `not-suitable-for-extraction`. The code is portable but the responsibility belongs to the Atelier-Kit application/brand rather than a general UI package. Reconsider only if the future package explicitly owns kit attribution.

### `MarkedTextField.svelte`

- **Source:** `src/lib/components/MarkedTextField.svelte`.
- **Responsibility:** Studio input/textarea, Atelier Mark toolbar, live parsed preview and optional epigraph display controls.
- **Direct consumers:** Studio about, catalog, collection new/edit, item new/edit, news new/edit, signal clouds, contact, footer, hero, identity and layout routes.
- **Public props:** `name`; optional `hint`, `value`, `rows`, `multiline`, `disabled`, `required`, `placeholder`, `display`, `showEpigraphControls`; callback `onvaluechange?: (name, value) => void`.
- **Events/callbacks/bindings/slots:** invokes `onvaluechange` reactively, including initial/synchronized draft changes; internal `bind:this` and `bind:value`; no slot or dispatched event.
- **Imported components:** `EditorialText`. **Modules:** Svelte `untrack`, operator `useI18n`, Atelier Mark tags/parser, site typography `FONT_PRESET_IDS`; no `$app/*`.
- **Domain/i18n/marked text:** directly couples Studio labels, Atelier Mark syntax/parser, hero display schema and Atelier-Kit font preset ids.
- **CSS assumptions/tokens:** assumes Studio form/control styling and preview classes; uses `--studio-accent`, `--studio-border`, `--studio-muted`, `--studio-panel-bg`, `--studio-text`; child preview also brings visitor site tokens through `EditorialText`.
- **Browser/lifecycle:** input selection/focus APIs and `queueMicrotask`; Svelte effects synchronize public and draft state.
- **Tests:** direct static-source assertions in `src/lib/marked-text.test.js`; parser tests are indirect. No runtime interaction/rendering test identified.
- **Assessment:** `high`; `studio-only-component`. It should remain with Studio unless a separate marked-text editor product is designed. Extraction needs injected toolbar schema/labels, renderer, typography choices and a clearer controlled-value callback contract.

### `MetaInfo.svelte`

- **Source:** `src/lib/components/MetaInfo.svelte`.
- **Responsibility:** flattens recursive metadata entries and renders grouped label/value rows with depth styling.
- **Direct consumers:** item-detail route.
- **Public props:** legacy `meta: Array<{ label, value?, children? }> = []`.
- **Events/callbacks/bindings/slots:** none. **Imports:** visitor i18n context; no components or `$app/*`.
- **Domain/i18n/marked text:** uses the Atelier-Kit recursive item metadata contract and a visitor heading/empty label; values are plain text, not Atelier Mark.
- **CSS assumptions/tokens:** uses inline `--depth` to indent rows and global `--site-border-color`, `--site-card-color`, `--site-heading-color`, `--site-surface-color`, `--site-text-color`.
- **Browser/lifecycle:** none.
- **Tests:** no direct component test; data-path tests, if any, do not establish rendered coverage.
- **Assessment:** `medium`; `atelier-kit-application-component`. A generic description-list primitive is plausible after passing a flat/generic tree model and resolved labels, but the current component is an item-detail feature.

### `PageSocialMeta.svelte`

- **Source:** `src/lib/components/PageSocialMeta.svelte`.
- **Responsibility:** conditionally emits Open Graph and Twitter title/description/image metadata.
- **Direct consumers:** item-detail and news-detail routes.
- **Public props:** optional `title`, `description`, `image`, each defaulting to `''`.
- **Events/callbacks/bindings/slots:** none. **Imports:** none; no `$app/*`, domain, i18n or marked-text dependency.
- **CSS assumptions/tokens:** none.
- **Browser/lifecycle:** Svelte head/SSR integration only.
- **Tests:** no direct component test identified.
- **Assessment:** `low`; `generic-ui-primitive`. The current API is portable, though Phase 2 should decide whether metadata policy (for example card type/canonical URLs) belongs in UI at all.

### `SignalCloud.svelte`

- **Source:** `src/lib/components/SignalCloud.svelte`.
- **Responsibility:** presents one question/options cloud, persists the selected option per item and broadcasts selection changes.
- **Direct consumers:** item-detail route.
- **Public props:** legacy required `itemId: string` and `cloud: { id, question, hint?, options: Array<{ id, label }> }`.
- **Events/callbacks/bindings/slots:** no Svelte event API; buttons call internal choice handling. It dispatches the global DOM `CustomEvent('atelier-kit:signal-change', { itemId, cloudId, optionId })`, which is consumed by `VisitorBrief`.
- **Imported components:** `EditorialText`. **Modules:** Svelte `onMount`, visitor i18n, `$lib/marked-text.js`; no `$app/*`.
- **Domain/i18n/marked text:** hard-coded signal-cloud and item-id contracts, storage-key/event protocol, visitor labels, Atelier Mark display for question/hint/options, and plain-text normalization for announcements.
- **CSS assumptions/tokens:** uses `--site-accent-color`, `--site-base-color`, `--site-border-color`, `--site-card-color`, `--site-heading-color`, `--site-surface-color`, `--site-text-color`.
- **Browser/lifecycle:** `onMount`, `localStorage`, `window.dispatchEvent`, `CustomEvent`.
- **Tests:** no direct component test. Signal-cloud validation/Studio tests cover domain transforms indirectly, not persistence or rendering.
- **Assessment:** `high`; `atelier-kit-application-component`. This is a feature with application persistence and cross-component protocol. Extraction would require injected storage and change callback, generic option data, resolved labels and a marked-text renderer.

### `SiteFooter.svelte`

- **Source:** `src/lib/components/SiteFooter.svelte`.
- **Responsibility:** renders configured footer columns, legal/copyright text, social icons and kit credit.
- **Direct consumers:** root layout.
- **Public props:** legacy `footer` with `columns`, `copyright`, `legal_line`, `show_social`; `socialLinks: { id, url }[]`; `locale = 'en'`.
- **Events/callbacks/bindings/slots:** none.
- **Imported components:** `KitCredit`, `SocialIcon`, `EditorialText`. **Modules:** footer-link externality helper, visitor i18n, marked-text plain normalization; no `$app/*`.
- **Domain/i18n/marked text:** footer config and social ids, kit branding, visitor social aria labels, Atelier Mark for visible configured copy and plain normalization for attributes.
- **CSS assumptions/tokens:** application footer layout and link columns; uses `--site-accent-color`, `--site-base-color`, `--site-text-color`.
- **Browser/lifecycle:** link behavior only; no lifecycle.
- **Tests:** direct static-source checks in `src/lib/social-networks.test.js` verify supported-network/icon integration; no runtime render/interaction test.
- **Assessment:** `high`; `atelier-kit-application-component`. It is a site-composition component. A package candidate would need generic columns, injected link policy, social registry/labels, optional credit renderer and an Atelier Mark boundary decision.

### `SiteHeader.svelte`

- **Source:** `src/lib/components/SiteHeader.svelte`.
- **Responsibility:** renders branded header/logo/title, menu, visitor search and optionally social links in normal/overlay presentation.
- **Direct consumers:** root layout.
- **Public props:** required `site` (`name`, optional header title/logo/alt); optional `menuNav`, `socialLinks`, `footer`, `overlay`, `searchIndex`.
- **Events/callbacks/bindings/slots:** none.
- **Imported components:** `EditorialText`, `SiteSearch`, `SocialIcon`. **Modules:** marked-text normalization, visitor i18n, site-branding resolver; SearchEntry type from search-index. No direct `$app/*` (child `SiteSearch` uses it).
- **Domain/i18n/marked text:** site branding, menu/footer/social/search models; social translation keys; Atelier Mark header title and plain-text logo alt; fixed home link.
- **CSS assumptions/tokens:** opinionated responsive/overlay header. Uses `--site-accent-color`, `--site-base-color`, `--site-border-color`, `--site-header-title-color`, `--site-heading-color`, `--site-muted-text-color`, `--site-text-color` and styles child/global editorial output.
- **Browser/lifecycle:** none directly; browser navigation and the child search behavior apply.
- **Tests:** direct static-source social-network checks in `src/lib/social-networks.test.js`; site-branding and search tests are indirect. No runtime header test.
- **Assessment:** `high`; `atelier-kit-application-component`. Extraction requires separating branding, navigation, search and social feature policies into injected data/renderers and documenting theme tokens.

### `SiteSearch.svelte`

- **Source:** `src/lib/components/SiteSearch.svelte`.
- **Responsibility:** filters an in-memory search index, renders an accessible result list and supports keyboard navigation.
- **Direct consumers:** `SiteHeader`.
- **Public props:** required `entries: SearchEntry[]`; `overlay?: boolean = false`.
- **Events/callbacks/bindings/slots:** internal input `bind:value`/`bind:this`, DOM submit/keyboard/click handlers; no public callback, binding or slot.
- **Imported components:** none. **Modules:** `$app/navigation` (`goto`), `$lib/search-index.js` filter/model, visitor i18n.
- **Domain/i18n/marked text:** fixed item/news result types and labels; SearchEntry contract/hrefs; visitor search translations. No Atelier Mark rendering.
- **CSS assumptions/tokens:** positioned dropdown assumes header placement and overlay mode; uses `--site-accent-color`, `--site-base-color`, `--site-card-color`, `--site-muted-text-color`, `--site-text-color`.
- **Browser/lifecycle:** input focus/blur and keyboard DOM APIs; SvelteKit client navigation on active Enter result.
- **Tests:** no direct component test; search-index tests, if present, cover filtering only indirectly.
- **Assessment:** `high`; `atelier-kit-application-component`. A reusable combobox could emerge after injecting filter/results, navigation callback, type labels and ids, but the current component is the application search feature.

### `SocialIcon.svelte`

- **Source:** `src/lib/components/SocialIcon.svelte`.
- **Responsibility:** chooses an inline decorative SVG for `instagram`, `facebook`, `x` or `github`.
- **Direct consumers:** `SiteHeader`, `SiteFooter`.
- **Public props:** required `id: string`; unknown ids render no icon.
- **Events/callbacks/bindings/slots:** none. **Imports:** none; no `$app/*`, data model, i18n or Atelier Mark dependency.
- **CSS assumptions/tokens:** SVGs use `currentColor`, fixed `viewBox`, `aria-hidden`; no CSS variables or component style block.
- **Browser/lifecycle:** none.
- **Tests:** direct static-source checks in `src/lib/social-networks.test.js` cover the configured id set/integration; no rendered SVG snapshot/accessibility test.
- **Assessment:** `low`; `reusable-giadaware-component`. It is self-contained but represents a curated Giadaware network/icon set rather than a generic icon primitive. Phase 2 must define icon asset licensing/versioning and unknown-id behavior.

### `StudioAccessGuide.svelte`

- **Source:** `src/lib/components/StudioAccessGuide.svelte`.
- **Responsibility:** renders operator help for local/remote Studio access and deployment/security workflow.
- **Direct consumers:** Studio help route.
- **Public props/events/callbacks/bindings/slots:** none.
- **Imports:** operator `useI18n` only; no component or `$app/*` dependency.
- **Domain/i18n/marked text:** all content is Studio/operator localization; copy and semantic structure assume Atelier-Kit deployment/access concepts. No Atelier Mark.
- **CSS assumptions/tokens:** scoped help/card styling with fixed colors; no CSS variables were referenced.
- **Browser/lifecycle:** none.
- **Tests:** no direct component test identified.
- **Assessment:** `high`; `studio-only-component`. This is product documentation embedded as UI and should remain in Atelier-Kit unless the same operational contract is deliberately shared.

### `StudioFieldLabel.svelte`

- **Source:** `src/lib/components/StudioFieldLabel.svelte`.
- **Responsibility:** renders label text, optional required/optional marker, and hint content for use inside a parent `<label>`.
- **Direct consumers:** `StudioItemGalleryFields`, `StudioItemMetaFields`, and Studio about, catalog, collection new/edit, item list/new/edit, news new/edit, signal clouds, appearance, contact, footer, hero, identity, layout, social and system routes.
- **Public props:** required `label`; optional `hint = ''`, `required = false`, `optional = false`.
- **Events/callbacks/bindings/slots:** none.
- **Imports:** operator `useI18n`; no components, `$app/*` or Atelier Mark.
- **Domain/i18n/marked text:** label/hint are already supplied, but required/optional marker text comes from Studio translation keys. Its markup assumes the consumer supplies the semantic parent `<label>`.
- **CSS assumptions/tokens:** scoped inline label/hint classes, no CSS variables; inherits parent typography/color and relies on placement inside Studio form layout.
- **Browser/lifecycle:** none.
- **Tests:** no direct component test identified; extensive route use is not test coverage.
- **Assessment:** `medium`; `studio-only-component`. For this required candidate, the real blocker is modest: supply resolved marker labels (or snippets), decide semantic ownership of `<label>`, and document layout expectations. It could then become a `generic-ui-primitive`, but is not one in its current API/context.

### `StudioFormLegend.svelte`

- **Source:** `src/lib/components/StudioFormLegend.svelte`.
- **Responsibility:** renders a fixed explanatory legend for required and optional Studio fields.
- **Direct consumers:** Studio about, catalog, collection list/new/edit, item list/new/edit, news list/new/edit, signal clouds, appearance, contact, footer, hero, identity, layout, social and system routes.
- **Public props/events/callbacks/bindings/slots:** none.
- **Imports:** operator `useI18n`; no `$app/*`, components or Atelier Mark.
- **Domain/i18n/marked text:** entirely fixed Studio/operator localization keys and form conventions.
- **CSS assumptions/tokens:** compact scoped legend styling with fixed muted color; no CSS custom properties.
- **Browser/lifecycle:** none.
- **Tests:** no direct component test identified.
- **Assessment:** `high`; `studio-only-component`. Although technically simple, its fixed copy and purpose are Studio-specific. A generic legend would be a different API with supplied content.

### `StudioFormStatus.svelte`

- **Source:** `src/lib/components/StudioFormStatus.svelte`.
- **Responsibility:** displays an aria-live status message and hides it after a configurable timeout.
- **Direct consumers:** Studio about, catalog, collection list/new/edit, item list/new/edit, news list/new/edit, signal clouds, appearance, contact, footer, hero, identity, layout, social and system routes.
- **Public props:** `message?: string = ''`, `status?: string = 'info'` (recognized tones: `success`, `warning`, `error`, otherwise `info`), `durationMs?: number = 5000`.
- **Events/callbacks/bindings/slots:** none; visibility is driven by message/effect rather than a public dismissal callback or binding.
- **Imports:** none; no `$app/*`, i18n, data model or Atelier Mark.
- **CSS assumptions/tokens:** scoped status/tone colors with no global variables; fixed palette is a design ownership question.
- **Browser/lifecycle:** timer lifecycle via Svelte `$effect`, `setTimeout` and cleanup `clearTimeout`; SSR effect behavior/version compatibility must be verified.
- **Tests:** no direct component test identified.
- **Assessment:** `low`; `generic-ui-primitive`. For this required candidate, coupling is genuinely low. Extraction should still define timer reset semantics, optional persistent/dismissible behavior, status type, reduced-motion/announcement expectations and tokenized colors.

### `StudioItemGalleryFields.svelte`

- **Source:** `src/lib/components/StudioItemGalleryFields.svelte`.
- **Responsibility:** edits, orders, adds and removes item gallery rows and notifies Studio dirty-state tracking.
- **Direct consumers:** Studio item-edit route.
- **Public props:** bindable `rows: Array<{ file, alt, role }>` defaulting to `[]`; optional `dirtyControl` typed as `StudioFormDirtyControl` and expected to expose `checkDirty()`.
- **Events/callbacks/bindings/slots:** public `bind:rows`; internal input bindings and handlers; calls `dirtyControl.checkDirty` after `tick`; no slots/events.
- **Imported components:** `StudioFieldLabel`. **Modules:** Svelte `tick`, operator i18n, type-only dirty-control contract; no `$app/*`.
- **Domain/i18n/marked text:** exact item gallery edit row and form-field names (`gallery_files`, `gallery_alts`, `gallery_roles`), Studio item translation keys and dirty-state protocol. No Atelier Mark.
- **CSS assumptions/tokens:** Studio ordered-row layout; uses `--studio-accent`, `--studio-border`, `--studio-muted`, plus fixed destructive colors and responsive breakpoint.
- **Browser/lifecycle:** DOM form inputs and `tick`; no browser storage/lifecycle.
- **Tests:** `src/lib/studio-item-gallery.test.js` covers gallery data transforms indirectly; no direct component behavior test.
- **Assessment:** `high`; `studio-only-component`. This is an item editor feature. Extraction would need generic row field definitions, injected labels/actions and an `onchange` callback instead of the application dirty-control import.

### `StudioItemMetaFields.svelte`

- **Source:** `src/lib/components/StudioItemMetaFields.svelte`.
- **Responsibility:** edits ordered item metadata rows with label/value suggestions and dirty-state notification.
- **Direct consumers:** Studio item-edit route.
- **Public props:** bindable `rows: Array<{ label, value }>`; `labels: string[]`; `values: string[]`; optional `dirtyControl: StudioFormDirtyControl`.
- **Events/callbacks/bindings/slots:** public `bind:rows`; internal field bindings/handlers; invokes `dirtyControl.checkDirty` after `tick`; no event or slot.
- **Imported components:** `StudioFieldLabel`. **Modules:** Svelte `tick`, operator i18n, type-only dirty-control contract; no `$app/*`.
- **Domain/i18n/marked text:** item metadata edit shape, specific form names/datalists, Studio item keys and dirty protocol. No Atelier Mark.
- **CSS assumptions/tokens:** same Studio ordered-row pattern; uses `--studio-accent`, `--studio-border`, `--studio-muted`, fixed destructive colors and breakpoint.
- **Browser/lifecycle:** DOM datalist/form behavior and `tick`; no lifecycle/storage.
- **Tests:** no direct component test identified; any item metadata parsing tests would be indirect.
- **Assessment:** `high`; `studio-only-component`. It should remain with the item editor; a reusable ordered-field editor would require a new schema/callback-driven API.

### `StudioNav.svelte`

- **Source:** `src/lib/components/StudioNav.svelte`.
- **Responsibility:** renders grouped Studio navigation and derives active states from the current pathname.
- **Direct consumers:** Studio root layout.
- **Public props/events/callbacks/bindings/slots:** none.
- **Imports:** `$app/state` (`page`) and operator i18n; no child components or Atelier Mark.
- **Domain/i18n/marked text:** fixed Studio information architecture, route paths/groups and translation keys.
- **CSS assumptions/tokens:** Studio sidebar/navigation layout uses `--studio-border`, `--studio-muted`, `--studio-text`, with fixed active colors.
- **Browser/lifecycle:** reactive SvelteKit page state; normal links and preview target.
- **Tests:** no direct component test identified.
- **Assessment:** `high`; `studio-only-component`. It is application navigation, not a generic nav. Reuse would require injected groups/links/current-path and resolved labels, effectively replacing the component contract.

### `VisitorBrief.svelte`

- **Source:** `src/lib/components/VisitorBrief.svelte`.
- **Responsibility:** reads saved signal selections, builds a localized item-interest brief, copies it, and creates email/WhatsApp share links.
- **Direct consumers:** item-detail route.
- **Public props:** legacy `item: { id, title }`, `signalClouds: Array<{ id, question, options[] }> = []`, `contact` with application email/WhatsApp config.
- **Events/callbacks/bindings/slots:** copy button handler; listens for global `atelier-kit:signal-change`; no public callback, binding, dispatched Svelte event or slot.
- **Imported components:** none. **Modules:** Svelte `onMount`, visitor i18n, marked-text plain normalization; no `$app/*`.
- **Domain/i18n/marked text:** item/signal/contact contracts, shared storage key and event protocol with `SignalCloud`, many visitor keys, legacy default-label localization policy, marked-text normalization, email and WhatsApp URL policy.
- **CSS assumptions/tokens:** uses `--site-accent-color`, `--site-base-color`, `--site-border-color`, `--site-card-color`, `--site-surface-color`, `--site-text-color`.
- **Browser/lifecycle:** `onMount`, `window.location`, event listener cleanup, `localStorage`, Clipboard API, `mailto:` and WhatsApp navigation.
- **Tests:** no direct component test identified; signal/contact/domain tests are indirect at best.
- **Assessment:** `high`; `atelier-kit-application-component`. It is a coordinated visitor feature. Extraction requires injected selected answers/storage, copy/share adapters, resolved copy, generic item data and an explicit callback/event contract.

## Dependency overview

### SvelteKit routing, navigation and state

Observed direct `$app/*` imports are limited to `SiteSearch` (`goto` from `$app/navigation`) and `StudioNav` (`page` from `$app/state`). Many other components remain route-coupled through literal hrefs: `BookReading`, `CatalogSidebar`, `ItemCard`, `SiteHeader` and `StudioNav`. Package extraction therefore needs both import inversion and href/route ownership decisions.

### Visitor i18n

`CatalogSidebar`, `ImageLightbox`, `ItemCard`, `MetaInfo`, `SignalCloud`, `SiteFooter`, `SiteHeader`, `SiteSearch` and `VisitorBrief` call `useVisitorI18n`. Their use requires the Atelier-Kit context provider and specific key namespace. Supplying already-resolved labels/messages is the smallest inversion for simple candidates; feature components may need formatter callbacks.

### Studio/operator i18n

`MarkedTextField`, `StudioAccessGuide`, `StudioFieldLabel`, `StudioFormLegend`, `StudioItemGalleryFields`, `StudioItemMetaFields` and `StudioNav` call `useI18n`. The number and specificity of keys shows that most are Studio features. `StudioFieldLabel` is the notable case where supplying two resolved marker labels could remove the context dependency.

### Atelier Mark and marked text

`EditorialText` directly parses/renders Atelier Mark. `BookReading`, `CatalogSidebar`, `ItemCard`, `MarkedTextField`, `SignalCloud`, `SiteFooter` and `SiteHeader` import it. `SignalCloud`, `SiteFooter`, `SiteHeader` and `VisitorBrief` also normalize marked text to plain text. This dependency crosses display, aria/alt text and message generation; Phase 2 must decide whether the format/parser is public package infrastructure or whether components accept renderers/snippets and plain strings.

### Item/content domain models

Item contracts affect `ItemCard`, `MetaInfo`, `SignalCloud`, `VisitorBrief`, `StudioItemGalleryFields` and `StudioItemMetaFields`. Other content contracts affect `BookReading` (news/book body), `CatalogSidebar` (about/news/collections/catalog), and the site shell. Most shapes are local JSDoc rather than a package-neutral public type, increasing drift risk.

### Site branding

`SiteHeader` imports `resolveHeaderTitle` and consumes header title/logo conventions. `KitCredit` consumes kit branding constants/helpers. `SiteFooter` includes kit credit. These are distinct ownership questions: site-brand rendering could be parameterized, while kit attribution is intentionally application identity.

### Layout contracts

`CatalogSidebar` imports `LAYOUT_BLOCK_IDS` and assumes fixed block ids/order. `SiteHeader` and `SiteFooter` assume placement in root layout and coordinated social/footer settings. Global theme variables are normally provided above them. These are composition contracts, not merely component props.

### Search

`SiteSearch` imports the `SearchEntry` model/filter and SvelteKit navigation; `SiteHeader` owns its placement and index input. Extraction needs to decide whether search is a feature package, a generic combobox with injected results, or remains in the application.

### Social networks

`SocialIcon` hard-codes four network icons. Header/footer separately map those ids to localized aria labels and receive `{ id, url }` data. A shared package would need one owner for the supported-id registry, labels, icons/assets and fallback behavior.

### Global CSS tokens

Visitor components collectively consume `--site-accent-color`, `--site-base-color`, `--site-border-color`, `--site-card-color`, `--site-header-title-color`, `--site-heading-color`, `--site-intro-title-color`, `--site-muted-text-color`, `--site-surface-color`, and `--site-text-color`. Studio components consume `--studio-accent`, `--studio-border`, `--studio-muted`, `--studio-panel-bg`, and `--studio-text`. `CatalogSidebar` additionally defines/uses local `--sidebar-*` tokens; `MetaInfo` uses local `--depth`. Defaults reduce breakage but do not establish token ownership or a supported theme API. Global class contracts in `EditorialText`/its consumers are another implicit dependency.

### Browser lifecycle and DOM APIs

`ImageLightbox` depends on native `<dialog>`, document detection and keyboard/click behavior. `SignalCloud` and `VisitorBrief` depend on `onMount`, `localStorage`, `window` and a shared custom-event protocol; `VisitorBrief` also uses Clipboard and URL schemes. `MarkedTextField` uses selection/focus and microtasks. `SiteSearch` uses input focus and keyboard navigation. `StudioFormStatus` owns timer cleanup. These require SSR-safe and browser-focused tests before packaging.

## Candidate groups

### Extractable with little or no modification

- `JsonLd`: data-only head primitive; verify SSR/serialization behavior.
- `PageSocialMeta`: small head primitive; decide whether social metadata policy belongs in UI.
- `SocialIcon`: self-contained Giadaware icon component; document supported ids and asset strategy.
- `StudioFormStatus`: technically generic and context-free; rename/namespace, type tones, document timer semantics and tokenize its palette if it becomes public.

### Potentially extractable after dependency inversion

- `EditorialText`: package Atelier Mark/parser/classes with it, or inject renderer/parser; document site tokens and global classes.
- `ImageLightbox`: pass resolved labels, use generic image sources, formalize controlled/bindable state, and isolate/test the dialog adapter.
- `StudioFieldLabel`: pass resolved required/optional labels and decide whether the component or caller owns the semantic `<label>`.
- `MetaInfo`: accept a package-neutral tree/rows and resolved heading/empty labels; document depth and site tokens.
- `CatalogSidebar`: replace content models/routes/layout ids/i18n with generic widget data or snippets and injected hrefs. This is a large redesign and may prove not worthwhile.
- `ItemCard`: inject href and cover resolution, accept generic display data, resolved labels and a text renderer/snippet instead of Atelier-Kit models/Atelier Mark.
- `SiteFooter`: inject columns/link policy/social registry/credit renderer, resolved labels and marked-text rendering.
- `SiteHeader`: inject branding/navigation/search/social renderers and resolved labels; document overlay and theme contracts.
- `SiteSearch`: inject filter/results/navigation callback/type labels and remove `$app/navigation` plus application SearchEntry ownership.
- `SignalCloud`: inject persistence and change callback, generic option data, labels and marked-text renderer.
- `VisitorBrief`: inject selections/storage, share/copy adapters, resolved messages and generic display strings.

Being listed here means “architecturally conceivable,” not “recommended for Phase 2 extraction”; several are currently classified as application components.

### Should remain in Atelier-Kit

- `BookReading`, `CatalogSidebar`, `ItemCard`, `MetaInfo`, `SignalCloud`, `SiteFooter`, `SiteHeader`, `SiteSearch`, `VisitorBrief`: current implementations are Atelier-Kit visitor/application features.
- `MarkedTextField`, `StudioAccessGuide`, `StudioFieldLabel`, `StudioFormLegend`, `StudioItemGalleryFields`, `StudioItemMetaFields`, `StudioNav`: current implementations are Studio-only. `StudioFieldLabel` may be revisited after the small inversion described above.
- `KitCredit`: its attribution purpose belongs to Atelier-Kit even though its implementation is small.

## Required candidate verification

| Candidate | Observed coupling | Difficulty | Refactoring needed | Preliminary classification |
| --- | --- | --- | --- | --- |
| `ItemCard` | Item/cover models, `/items` routing, visitor i18n, Atelier Mark, seven site tokens, image error fallback | high | Generic display model; injected href and image policy; resolved labels; renderer/snippet; documented tokens | `atelier-kit-application-component` |
| `ImageLightbox` | Visitor i18n, Atelier image `{ file, alt, role }`, mutable legacy props, native dialog/DOM | medium | Resolved labels; generic sources; explicit controlled/bindable API; dialog accessibility tests | `reusable-giadaware-component` |
| `StudioFieldLabel` | Studio i18n and parent-label/layout convention; no data or SvelteKit coupling | medium | Resolve marker labels outside; clarify semantic label ownership and styling contract | `studio-only-component` |
| `StudioFormStatus` | Timer/effect and fixed palette only; no app import, i18n, model or global token | low | Type tones; define timeout/reset/accessibility behavior; optionally tokenize colors and rename | `generic-ui-primitive` |

Thus none of the four is presumed extractable merely because it was highlighted. `StudioFormStatus` is the cleanest; `ImageLightbox` is plausible after a bounded inversion; `StudioFieldLabel` is currently Studio-only but close to a primitive; `ItemCard` is an application feature without substantial redesign.

## Risks and unknowns

- **Localization ownership:** whether a package owns translation keys/providers or receives resolved labels and formatter callbacks; visitor and operator namespaces may not belong together.
- **CSS token ownership:** which package specifies visitor/Studio tokens, defaults, global classes and browser feature requirements such as `color-mix()`/`:has()`.
- **Data-contract ownership:** current local shapes for items, content, branding, search, social and contact need stable public types or adapters; copying them would create drift.
- **One package versus visitor/Studio separation:** the coupling graphs and styling contexts are distinct. A single package risks importing Studio dependencies into visitor surfaces or vice versa.
- **Atelier Mark package boundary:** parser, normalization, renderer, syntax classes and authoring controls must either cross together or be inverted behind renderer/plain-text interfaces.
- **Visual/accessibility testing:** no runtime component suite was identified. Dialog focus trapping/restoration, search combobox behavior, live regions, keyboard navigation, contrast and responsive layouts need tests before extraction.
- **Svelte version compatibility:** the set mixes legacy `export let`/`on:` syntax with Svelte 5 runes and bindable props. A public compatibility/support range and compiled-vs-source distribution strategy are unresolved.
- **Assets and icons:** social SVG ownership, licensing, additions, tree-shaking and unknown-id behavior need a strategy; site logo/image paths are application data.
- **Feature extraction risk:** cards, search, signal selection, visitor brief, site shell and book reading may look like reusable components while actually encoding Atelier-Kit features, routes and policies. Extracting them prematurely would move coupling rather than remove it.
- **Browser/SSR boundary:** storage, clipboard, dialog, page state and navigation adapters need deterministic SSR behavior and testable failure modes.
- **API semantics:** callback timing in `MarkedTextField`, mutable props in `ImageLightbox`, dirty-control calls in item editors and auto-dismiss behavior in `StudioFormStatus` should be made explicit before becoming public contracts.

## Suggested Phase 2 inputs

Phase 2 should decide, without treating this inventory as the boundary document:

1. Package scope: generic primitives only, Giadaware shared presentation, or selected visitor/Studio feature layers—and whether visitor and Studio are separate entry points/packages.
2. The initial candidate set and explicit exclusions, starting with evidence from `JsonLd`, `PageSocialMeta`, `SocialIcon`, `StudioFormStatus`, `ImageLightbox`, `StudioFieldLabel` and `EditorialText`.
3. Ownership/versioning of Svelte/SvelteKit, Atelier Mark, i18n contexts/keys, domain types, theme tokens/global classes and SVG/assets.
4. Dependency-inversion conventions: resolved labels, navigation callbacks, generic data adapters, renderer/snippet interfaces, persistence/share adapters and dirty-state callbacks.
5. Public API rules for props, bindability, callbacks, SSR/browser behavior, accessibility and deprecation.
6. Test gates: runtime component tests, visual regression, keyboard/screen-reader checks, SSR/hydration and supported Svelte-version matrix.
7. Migration sequencing and acceptance criteria that allow components to remain in Atelier-Kit when inversion would recreate an application feature in a shared package.

Those decisions are inputs to a future definitive boundary document; they are intentionally not made here.
