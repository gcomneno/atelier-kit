# Recipe: artist portfolio

Use this recipe for paintings, studies, illustrations, sketches or visual experiments.

## Files to edit

```text
config/site.yaml
content/items/<artwork-id>.yaml
content/collections/<collection-id>.yaml
```

## 1. Site identity

```yaml
site:
  name: "Small Room Studies"
  tagline: "Paintings, visual notes and quiet experiments"
  language: "en"
  notice: ""
  footer_note: "Built with Atelier-Kit"
```

## 2. Create an artwork item

```bash
npm run item:new -- blue-window-study "Blue Window Study" -- --preset artwork
```

Example item:

```yaml
id: "blue-window-study"
title: "Blue Window Study"
subtitle: "Oil study on paper"
status: "available"
price_mode: "hidden"
image_file: "/images/items/blue-window-study.jpg"
image_alt: "Blue-toned oil study on paper"
description: "A small oil study focused on window light, muted color and a quiet interior mood."
notice: ""

meta:
  - label: "Technique"
    value: "Oil"

  - label: "Support"
    value: "Paper"

  - label: "Dimensions"
    value: "21 × 29.7 cm"

  - label: "Year"
    value: "2026"

  - label: "Frame"
    value: "Unframed"

  - label: "Availability"
    value: "Available"
```

## 3. Collection

```yaml
id: "window-studies"
title: "Window studies"
description: "Small works about light, silence and interior spaces."
items:
  - blue-window-study
```

Save it as:

```text
content/collections/window-studies.yaml
```

## 4. Visitor Brief usage

Keep Signal Clouds focused on visitor intent:

```yaml
signal_clouds:
  - id: "interest"
    question: "What interests you?"
    options:
      - id: "available-work"
        label: "Available work"
      - id: "process"
        label: "The process"

  - id: "mood"
    question: "Which mood are you drawn to?"
    options:
      - id: "quiet"
        label: "Quiet"
      - id: "dramatic"
        label: "Dramatic"
```

## Pre-publish checklist

```bash
npm run item:list
npm run content:validate
npm run content:doctor
npm run check
npm run build
```
