# Recipe: collector showcase

Use this recipe for **personal collections** — trading cards, figurines, stickers, pins, LEGO minifigs, vintage toys or any small collectible set.

Atelier-Kit is a **showcase**, not a marketplace. There is no cart, no swap engine and no chat between users.

Physical trades happen **offline** (school gate, park, with a parent present). The site helps visitors **see the collection** and **start a conversation** with a pre-filled Visitor Brief — shaped by Signal Clouds you choose for trading.

## Who this fits

- kids and teens cataloguing Pokémon, football stickers, Panini, etc.;
- hobby collectors sharing a public “have list”;
- small clubs where members link their showcase and negotiate swaps elsewhere.

## Safety notes (especially for minors)

- put a **parent or guardian** email / WhatsApp in `config/contact.yaml`, not the child’s personal phone if avoidable;
- avoid home addresses; use Signal Clouds like “meet with adult nearby” instead;
- photos of **objects only** — no faces or identifiable home backgrounds unless intended;
- say clearly on the site notice: *“Scambi solo con adulto presente”* / *“Trades with adult supervision only”*.

## Files to edit

```text
config/site.yaml
config/contact.yaml
config/signal-clouds.yaml
config/catalog.yaml
content/items/<item-id>.yaml
content/collections/<collection-id>.yaml
```

Or use the studio after `npm run studio:launch`.

## 1. Site identity

```yaml
site:
  name: "Luca’s Card Shelf"
  tagline: "My collection — open to swaps"
  language: "it"
  notice: "Scambi solo con un adulto presente. Nessuna vendita sul sito."
  footer_note: "Collezione personale di Luca"
```

## 2. Catalog labels

Tune how items are named on the public site:

```yaml
catalog:
  item_name_singular: "carta"
  item_name_plural: "carte"
  fields:
    show_price: false
    show_availability: true
    show_material: false
    show_dimensions: false
    show_status: true
    show_meta: true
```

Adjust for figurines (`entità`) or stickers as needed.

## 3. Create a collection item

```bash
npm run item:new -- charizard-sv "Charizard ex" -- --preset default
```

Example item (trading card):

```yaml
id: "charizard-sv"
title: "Charizard ex"
subtitle: "Scarlet & Violet · double rare"
status: "for-trade"
price_mode: "hidden"
image_file: "/images/items/charizard-sv.jpg"
image_alt: "Charizard ex trading card in a sleeve"
description: "Double rare from my personal binder. Edge is clean; stored in sleeve + top loader."
notice: "Disponibile per scambio — guarda i Signal qui sotto."

meta:
  - label: "Set"
    value: "Scarlet & Violet"

  - label: "Number"
    value: "223/198"

  - label: "Rarity"
    value: "Double rare"

  - label: "Condition"
    value: "Near mint"

  - label: "Duplicate"
    value: "Yes — I have two"

  - label: "Availability"
    value: "For trade"
```

**Status ideas:** `for-trade`, `showcase-only`, `reserved`, `traded`.

Use collections to group sets:

```yaml
id: "scarlet-violet-trade"
title: "Scarlet & Violet — for trade"
description: "Doppioni e carte che cerco di scambiare."
items:
  - charizard-sv
```

## 4. Signal Clouds for physical swaps

These questions feed the **Visitor Brief** on each item page. Pick labels that match your audience and language. Edit in studio under **Segnali** or in `config/signal-clouds.yaml`.

Ids stay fixed once published; you can change **labels** anytime.

```yaml
signal_clouds:
  - id: trade_intent
    enabled: true
    question: "Cosa ti interessa?"
    hint: "Scegli un’opzione — finisce nel messaggio al collezionista."
    options:
      - id: swap
        label: "propongo uno scambio"
      - id: offer
        label: "ho qualcosa da offrirti (vedi messaggio)"
      - id: ask
        label: "ti chiedo info su questa carta"
      - id: just_browse
        label: "solo curiosità"

  - id: meetup
    enabled: true
    question: "Come preferiresti fare?"
    hint: "Gli scambi fisici avvengono fuori dal sito, con accordo tra adulti."
    options:
      - id: local_adult
        label: "incontro in zona con un adulto"
      - id: school
        label: "a scuola (con permesso genitore)"
      - id: event
        label: "a un evento / torneo"
      - id: mail_parent
        label: "spedizione — solo con genitore che organizza"

  - id: looking_for
    enabled: true
    question: "Nel mio scaffale cerco soprattutto…"
    hint: "Aiuta l’altro a capire cosa proporti."
    options:
      - id: same_set
        label: "carte dello stesso set"
      - id: missing_slot
        label: "il numero che mi manca nel album"
      - id: rare_upgrade
        label: "rarità più alta"
      - id: any_fair
        label: "proposte equilibr — scrivimi"

  - id: condition
    enabled: true
    question: "La tua carta / figurina è…"
    hint: "Onestà prima dello scambio."
    options:
      - id: mint
        label: "come nuova (in bustina o equivalente)"
      - id: near_mint
        label: "ottima — sleeve da subito"
      - id: played
        label: "giocata ma decente"
      - id: tell_me
        label: "ti descrivo tutto nel messaggio"
```

You do **not** need all four clouds — start with `trade_intent` + `meetup`.

To hide a cloud without editing YAML by hand, track [issue #59](https://github.com/gcomneno/atelier-kit/issues/59) (studio toggle / remove).

## 5. Contact flow (parent-friendly)

```yaml
contact:
  email:
    enabled: true
    label: "Scrivi al genitore via email"
    address: "genitore@example.com"
    subject_prefix: "Scambio carte —"
  whatsapp:
    enabled: true
    label: "WhatsApp (genitore)"
    phone: "+393331234567"
```

The visitor picks Signal answers → Visitor Brief assembles text → one tap to email or WhatsApp. **No swap happens on the website.**

## 6. Typical visitor flow

1. Friend opens `/items/charizard-sv`.
2. Picks Signal options (“propongo scambio”, “incontro con adulto”, …).
3. Visitor Brief updates with choices + item link.
4. Sends WhatsApp to parent with a clear, copy-paste message.
5. Adults agree time/place offline.

## What this recipe does **not** do

- match “have / want” lists automatically;
- verify card authenticity;
- hold items in escrow or record completed trades;
- replace dedicated trade apps or moderated communities.

That is intentional — keep the kit small and safe.

## Pre-publish checklist

```bash
npm run content:validate
npm run content:doctor
npm run check
npm run build
```

In studio: **Stato pubblicazione** → review doctor notes → `npm run publish -- --deploy` when ready.

## Related

- [`no-textarea-contact-flow.md`](no-textarea-contact-flow.md)
- [`small-collection-launch.md`](small-collection-launch.md)
- [`../usage/contact-flow.md`](../usage/contact-flow.md)
- [`../product/service-package.md`](../product/service-package.md) — “kit setup light” for a parent who already has photos
