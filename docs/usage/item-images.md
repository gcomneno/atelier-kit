# Item image galleries

Atelier-Kit supports two item image shapes.

The legacy shape is still valid and remains the safest baseline for existing client sites:

```yaml
image_file: "/images/items/example.jpg"
image_alt: "Short useful description of the image"
```

The gallery shape is optional and lets an item expose more than one image:

```yaml
image_file: "/images/items/example-cover.jpg"
image_alt: "Front view of the piece"

images:
  - file: "/images/items/example-cover.jpg"
    alt: "Front view of the piece"
    role: "cover"
  - file: "/images/items/example-detail.jpg"
    alt: "Close detail of the material"
    role: "detail"
  - file: "/images/items/example-context.jpg"
    alt: "The piece shown in context"
    role: "context"
```

## Compatibility rule

Existing items that only define `image_file` and `image_alt` continue to work.

When `images` is present and contains at least one valid image, the visitor item page uses that gallery. The cover image is the first image with `role: "cover"`. If no image has `role: "cover"`, the first gallery image is used as the cover.

For compatibility, keep `image_file` and `image_alt` in item files for now. They still act as the legacy cover fields and are used by older workflows.

## Validation rules

Each gallery entry must be an object with:

- `file`: required image path, starting with `/`;
- `alt`: optional but strongly recommended;
- `role`: optional free-form label such as `cover`, `detail`, `context`, `studio`, or `installation`.

The referenced image file must exist under `static/`.

Run:

```bash
npm run content:validate
```

## Visitor behavior

On the item detail page:

- the cover image remains the main visual;
- gallery thumbnails appear when an item has more than one image;
- clicking the cover or a thumbnail opens the lightbox;
- the lightbox supports previous/next navigation when multiple images are available.

Catalog cards intentionally keep using only the cover image.

## Studio limitation

The Studio item editor still manages the single cover image fields for now: `image_file`, `image_alt`, and the existing single upload control.

When an item already has `images`, Studio preserves the gallery on save and syncs the effective gallery cover entry with the edited cover path and alt text.

Gallery editing from Studio, including add, upload, reorder, and remove controls, is future work. For now, edit the full `images` list manually in the YAML file.
