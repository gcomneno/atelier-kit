# Content Doctor

The Content Doctor checks whether a customized Atelier-Kit showcase still looks like starter/demo content.

It is different from validation.

## Validator vs Doctor

The validator checks structural correctness:

```bash
npm run content:validate
```

It catches problems such as:

- missing required fields;
- duplicate ids;
- invalid YAML structure;
- missing image files.

The doctor checks publishing readiness:

```bash
npm run content:doctor
```

It warns about things that may technically work but look unfinished.

## What the doctor checks

Examples:

- placeholder images;
- `Replace with` text;
- demo notices;
- draft/demo item statuses;
- test, smoke or sample item ids;
- very short descriptions;
- missing meta information;
- placeholder contact email such as `hello@example.com`;
- enabled WhatsApp action without a usable phone number;
- Signal Clouds with fewer than two options;
- active site notices.

## Non-fatal by default

Doctor warnings do not fail by default.

This keeps the starter project usable even when it intentionally contains demo content.

## Friendly output

By default, the doctor explains each note in plain language:

- what looks unfinished;
- which file to open;
- what to change before publishing.

Use verbose mode when you want the older technical format:

```bash
npm run content:doctor -- --verbose
```

## Strict mode

Use strict mode when you want warnings to fail the command:

```bash
npm run content:doctor -- --strict
```

This can be useful before publishing a real customized showcase.

## Recommended pre-publish flow

```bash
npm run item:list
npm run content:validate
npm run item:validate
npm run content:doctor
npm run check
npm run build
```
