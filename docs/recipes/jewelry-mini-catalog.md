# Recipe: jewelry mini-catalog

Use this recipe for a small set of rings, pendants, earrings or wearable pieces.

Atelier-Kit does not provide cart, checkout or stock management.

Use it as a showcase and contact flow.

## Files to edit

```text
config/site.yaml
config/contact.yaml
content/items/<piece-id>.yaml
content/collections/<collection-id>.yaml
```

## 1. Site identity

```yaml
site:
  name: "Tiny Silver Bench"
  tagline: "Small silver pieces made in quiet batches"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
```

## 2. Create a jewelry item

```bash
npm run item:new -- hammered-silver-ring "Hammered Silver Ring" -- --preset jewelry
```

Example item:

```yaml
id: "hammered-silver-ring"
title: "Hammered Silver Ring"
subtitle: "Simple silver ring with a textured finish"
status: "available"
price_mode: "hidden"
image_file: "/images/items/hammered-silver-ring.jpg"
image_alt: "Hammered silver ring on a neutral background"
description: "A simple silver ring with a lightly hammered surface and a soft handmade feel."
notice: "Contact for sizing and availability."

meta:
  - label: "Material"
    value: "Silver"

  - label: "Size"
    value: "Made to size"

  - label: "Finish"
    value: "Hammered"

  - label: "Care"
    value: "Keep dry and polish gently"

  - label: "Availability"
    value: "Available on request"
```

## 3. Contact flow

```yaml
contact:
  email:
    enabled: true
    label: "Email this brief"
    address: "hello@example.com"
    subject_prefix: "Interest in"
  whatsapp:
    enabled: false
    label: "WhatsApp this brief"
    phone: ""
```

Replace `hello@example.com` before publishing.

## 4. Collection

```yaml
id: "silver-essentials"
title: "Silver essentials"
description: "Small wearable pieces with simple forms."
items:
  - hammered-silver-ring
```

## Pre-publish checklist

```bash
npm run content:doctor
npm run check
npm run build
```
