# Marked text field inventory

`src/lib/marked-text.js` is the executable inventory for Studio-managed public text. Plain YAML strings remain valid: Atelier Mark is opt-in syntax and no client migration is required.

## Marked editorial fields

| Source / YAML path | Studio | Mode | Public visual consumers | Plain-text consumers |
|---|---|---|---|---|
| `site.header_title`, `site.tagline`, `site.intro_title`, `site.hero_intro`, `site.hero_signature`, `site.footer_note` | Site identity | single-line except intro/signature multiline | header, home hero/footer | title/description, OG, RSS, accessibility |
| `site.hero_banner.description`, `.caption` | Hero banner | multiline / single-line | home banner | accessibility fallbacks where used |
| `catalog.eyebrow`, `.intro` | Catalog | single-line / multiline | home and `/catalog` | metadata |
| `about.title`, `.intro`, `.sections[*].heading`, `.body` | About | heading single-line; copy multiline | home projection and `/about` | metadata and JSON-LD |
| item `title`, `subtitle`, `description`, `notice` | Items new/edit | title/subtitle single-line; copy multiline | cards and item detail | metadata, search, breadcrumbs, aria/contact brief |
| collection `title`, `description` | Collections new/edit | single-line / multiline | home/list/detail | metadata and breadcrumbs |
| news `title`, `excerpt`, `body` | News new/edit | title single-line; copy multiline | home/list/detail | metadata, search, JSON-LD and RSS |
| footer `copyright`, `legal_line`, column `title`, link `label` | Footer | single-line | public footer | navigation/accessibility labels |
| `layout.blocks.*.label` | Layout | single-line | existing block-label render sites | menu/navigation labels; provenance is unchanged |
| contact email/WhatsApp `label` | Contact | single-line | Visitor Brief actions | aria/message fallbacks; address, phone and subject prefix stay plain |
| Signal Cloud `question`, `hint`, option `label`, FAQ `answer`, `group` | Signal Clouds | answer multiline; others single-line | item signals and `/faq` | Visitor Brief and FAQ JSON-LD |

All marked paths use `MarkedTextField`, pre-write server validation, the same parser in `content:validate` and `content:doctor`, `EditorialText` (inline inside headings; paragraph-aware for multiline copy), `markedTextToPlainText` at non-visual boundaries, and registry-driven public font discovery.

## Deliberately plain-only fields

IDs and slugs; dates, numbers, order values and enums; URL/email/telephone/href values; paths, filenames, files and uploads; every image alt; appearance/configuration/status tokens; search/checkbox/select controls; item price mode/status/preset and structured meta; catalog singular/plural machine labels; Signal Cloud IDs, enabled/order/visibility flags; social network IDs/URLs. These values are identifiers, transport data, accessibility descriptions, configuration, or machine-readable controls and must never be parsed as Atelier Mark.

About portrait caption is intentionally absent: issue #150 owns that new field. Eyebrow provenance is unchanged because issue #149 owns Layout-label precedence.
