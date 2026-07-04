# Recipe: handmade object showcase

Use this recipe for ceramics, textile work, carved objects, small decor pieces or other handmade objects.

## Files to edit

```text
config/site.yaml
config/signal-clouds.yaml
content/items/<item-id>.yaml
content/collections/<collection-id>.yaml
```

## 1. Site identity

```yaml
site:
  name: "Quiet Clay Studio"
  tagline: "Small handmade objects for slow homes"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
```

## 2. Create an item

```bash
npm run item:new -- stoneware-cup "Stoneware Cup" -- --preset handmade
```

Then edit:

```text
content/items/stoneware-cup.yaml
```

Example item:

```yaml
id: "stoneware-cup"
title: "Stoneware Cup"
subtitle: "Wheel-thrown cup with matte glaze"
status: "available"
price_mode: "hidden"
image_file: "/images/items/stoneware-cup.jpg"
image_alt: "Stoneware cup with a matte neutral glaze"
description: "A small wheel-thrown stoneware cup designed for everyday use and quiet tables."
notice: ""

meta:
  - label: "Material"
    value: "Stoneware"

  - label: "Dimensions"
    value: "8 cm tall"

  - label: "Finish"
    value: "Matte glaze"

  - label: "Care"
    value: "Hand wash recommended"

  - label: "Availability"
    value: "Available on request"
```

## 3. Signal Clouds

```yaml
signal_clouds:
  - id: "use"
    question: "What are you looking for?"
    options:
      - id: "daily"
        label: "Daily use"
      - id: "gift"
        label: "A quiet gift"

  - id: "mood"
    question: "Which mood fits best?"
    options:
      - id: "calm"
        label: "Calm"
      - id: "earthy"
        label: "Earthy"
```

## 4. Collection

```yaml
id: "quiet-table"
title: "For a quiet table"
description: "Small handmade pieces for everyday rituals."
items:
  - stoneware-cup
```

Save it as:

```text
content/collections/quiet-table.yaml
```

## Pre-publish checklist

```bash
npm run content:validate
npm run content:doctor
npm run check
npm run build
```
