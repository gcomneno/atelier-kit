# Client intake brief

Use this brief before creating a new Atelier-Kit site for a real person, project or small creative activity.

The goal is not to collect every possible requirement. The goal is to collect enough information to prepare a small, file-based showcase without turning the project into a CMS, database, blog, shop or admin panel.

## How to use it

Copy this document into the client project notes, fill it in with the client, then use it to configure:

- `config/site.yaml`
- `config/catalog.yaml`
- `config/signal-clouds.yaml`
- `config/contact.yaml`
- `content/items/`
- `content/collections/`
- `static/images/items/`

For now, this is a manual brief. For guided setup, see `npm run site:wizard` and [`docs/product/product-levels.md`](product/product-levels.md).

## Project identity

```text
Project name:
Public site title:
Short tagline:
Primary language:
Secondary language, if any:
Public GitHub repository name, if any:
Local folder name:
Deployment target:
```

Notes:

- Keep the title human and specific.
- Avoid generic landing-page language.
- Avoid promising features the site does not have.

## Owner / client profile

```text
Name or public identity:
Role or craft:
Location, if public:
Short one-sentence description:
What should visitors understand in 10 seconds?
What should visitors be able to do after reading the site?
```

## Site purpose

Choose one primary purpose.

```text
Primary purpose:
  [ ] present a portfolio
  [ ] present a small catalog
  [ ] present writing or creative projects
  [ ] present handmade objects
  [ ] present artwork
  [ ] present a launch collection
  [ ] other:

What is explicitly out of scope?
  [ ] ecommerce
  [ ] blog
  [ ] newsletter
  [ ] booking system
  [ ] comments
  [ ] user accounts
  [ ] admin UI
  [ ] contact form backend
  [ ] other:
```

## Audience

```text
Primary visitor:
Secondary visitor:
What are they looking for?
What doubts might they have?
What should the site make easier for them?
```

## Desired tone

```text
Tone keywords:
Words to avoid:
Examples of sites, pages or moods that feel close:
Examples of sites, pages or moods that feel wrong:
```

Useful tone checks:

- Does this sound like the real person/project?
- Does it avoid fake corporate language?
- Does it avoid over-selling?
- Does it still explain the work clearly?

## Content model

Map the real-world project into Atelier-Kit concepts.

```text
Item means:
Collection means:
Signal Clouds mean:
Visitor Brief should help the visitor say:
Contact actions should lead to:
```

Examples:

- Item = handmade object, artwork, jewelry piece, print, furniture piece, novel, short story, narrative project.
- Collection = curated selection, launch group, reading path, works in progress, available works.
- Signal Clouds = visitor mood, style preference, practical interest, reading tone, object use case.

## First items

List the first 1-5 items. Do not start with too many.

```text
Item 1
  id:
  title:
  type:
  status:
  short description:
  image available?
  important meta fields:
  contact angle:

Item 2
  id:
  title:
  type:
  status:
  short description:
  image available?
  important meta fields:
  contact angle:
```

Recommended presets:

```text
handmade
artwork
jewelry
print
furniture
writing
```

For writing/author sites, useful meta fields include:

- Format
- Genre
- Language
- Length
- Reading status
- Availability
- Tone
- Setting
- Notes

## Collections

```text
Collection 1
  id:
  title:
  description:
  item ids in display order:

Collection 2
  id:
  title:
  description:
  item ids in display order:
```

Keep collections curated. They are not a tag system or a search system.

## Signal Clouds

Signal Clouds should help the visitor express interest without writing into a form.

```text
Cloud 1
  label:
  options:

Cloud 2
  label:
  options:

Cloud 3
  label:
  options:
```

Guidelines:

- Use clear labels.
- Keep options short.
- Avoid technical categories unless visitors already understand them.
- Prefer visitor-facing language.

## Contact flow

```text
Email enabled?
Email address:
Email subject prefix:
WhatsApp enabled?
WhatsApp number:
Preferred contact sentence:
Anything visitors should not contact about?
```

Remember: Atelier-Kit does not provide a textarea backend. The Visitor Brief is copied or opened through configured contact channels.

## Assets

```text
Logo available?
Images available?
Image style:
Missing images:
Placeholder images allowed temporarily?
Credits or attribution needed?
```

Do not commit private, licensed or sensitive assets unless the repository and deployment flow are appropriate.

## Publish readiness

```text
Can this be public now?
What must be replaced before public launch?
What is intentionally demo/starter content?
What should Content Doctor warn about?
What should be checked manually?
```

Before publishing, run:

```bash
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```

Use strict doctor mode when preparing a real public launch:

```bash
npm run content:doctor -- --strict
```

## Writing / author showcase example

This example maps a writer's personal noir showcase into Atelier-Kit without adding a blog, CMS or ecommerce layer.

```text
Project name:
  Noir writing showcase

Public site title:
  Giancarlo · Noir writings

Short tagline:
  Romanzi in lavorazione, racconti storti e piccoli esperimenti nel buio.

Item means:
  novel, short story or narrative project

Collection means:
  reading path, works in progress, short stories, published works

Signal Clouds mean:
  atmosphere, reader curiosity, tone, project interest

Visitor Brief should help the visitor say:
  which story/project caught their attention and what kind of noir mood they are looking for

Contact actions should lead to:
  direct email contact, optionally WhatsApp

Out of scope:
  blog, newsletter, ecommerce, comments, login, admin UI, backend contact form
```

Possible writing Signal Clouds:

```text
Atmosphere:
  rain
  smoke
  silence
  old papers
  city night

Reader interest:
  novel
  short story
  work in progress
  behind the scenes
  collaboration

Tone:
  noir
  absurd
  psychological
  grotesque
  restrained
```

## Output checklist

After filling the brief, the first site setup should produce:

- configured site identity;
- configured contact actions;
- first Signal Clouds;
- at least one real or clearly marked placeholder item;
- at least one collection if useful;
- no unintended starter/demo text;
- passing validation;
- passing build;
- a clean initial commit in the separate client repository.
