# Recipe: replacing all demo content safely

Use this recipe before publishing a real customized showcase.

## 1. List items

```bash
npm run item:list
```

## 2. Replace site identity

Edit:

```text
config/site.yaml
```

Remove demo notices unless they are intentional.

## 3. Replace contact placeholders

Edit:

```text
config/contact.yaml
```

Replace:

```text
hello@example.com
```

If WhatsApp is enabled, provide a valid phone number.

## 4. Replace starter items

Edit every file under:

```text
content/items/
```

Replace:

- placeholder image paths;
- `Replace with` text;
- demo descriptions;
- draft/demo statuses;
- missing image alt text;
- unfinished meta values.

## 5. Replace images

Add real images under:

```text
static/images/items/
```

Then update item YAML:

```yaml
image_file: "/images/items/example.jpg"
image_alt: "Short useful description of the image"
```

## 6. Check collections

Edit files under:

```text
content/collections/
```

Make sure every item id exists.

## 7. Run the doctor

```bash
npm run content:doctor
```

Warnings are not fatal by default, but they are useful before publishing.

For a strict gate:

```bash
npm run content:doctor -- --strict
```

## 8. Final checks

```bash
npm run content:validate
npm run item:validate
npm run check
npm run build
```
