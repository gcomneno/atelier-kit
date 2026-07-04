# Recipe: no-textarea contact flow

Atelier-Kit intentionally avoids public textarea forms and backend message storage.

Instead, visitors select Signal Cloud options, copy a Visitor Brief or send it through configured contact actions.

## Files to edit

```text
config/signal-clouds.yaml
config/contact.yaml
```

## 1. Configure Signal Clouds

```yaml
signal_clouds:
  - id: "intent"
    question: "What would you like to do?"
    options:
      - id: "ask"
        label: "Ask a question"
      - id: "reserve"
        label: "Ask about availability"

  - id: "timeline"
    question: "When are you thinking about it?"
    options:
      - id: "soon"
        label: "Soon"
      - id: "later"
        label: "Later"
```

## 2. Configure contact actions

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

## 3. Visitor flow

On an item page, visitors can:

- select Signal Cloud answers;
- copy the generated Visitor Brief;
- open a pre-filled email action;
- optionally open a WhatsApp action when configured.

## 4. Why this exists

This keeps Atelier-Kit simple:

- no contact-form backend;
- no message database;
- no spam queue;
- no public comments;
- no accounts.

## Pre-publish checklist

```bash
npm run content:doctor
npm run check
npm run build
```
