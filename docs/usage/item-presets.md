# Item meta presets

Atelier-Kit item files include a flexible `meta` tree.

The item helper can generate starter meta information for common showcase types.

## Usage

Create an item with the default preset:

```bash
npm run item:new -- ceramic-blue-bowl "Ceramic Blue Bowl"
```

Create an item with a specific preset:

```bash
npm run item:new -- oil-study "Oil Study" -- --preset artwork
```

You can also use:

```bash
npm run item:new -- silver-ring "Silver Ring" -- --preset jewelry
```

## Available presets

- `default`
- `handmade`
- `artwork`
- `jewelry`
- `print`
- `furniture`
- `writing`

## Preset examples

### `handmade`

Useful for handmade objects and craft pieces.

Generated starter fields include:

- Material
- Dimensions
- Finish
- Care
- Availability
- Object details

### `artwork`

Useful for paintings, studies, illustrations and visual works.

Generated starter fields include:

- Technique
- Support
- Dimensions
- Year
- Frame
- Availability
- Notes

### `jewelry`

Useful for rings, pendants, earrings and small wearable pieces.

Generated starter fields include:

- Material
- Size
- Finish
- Stone or detail
- Care
- Availability

### `print`

Useful for prints, posters and editions.

Generated starter fields include:

- Print technique
- Paper
- Size
- Edition
- Frame
- Availability

### `furniture`

Useful for small furniture or interior objects.

Generated starter fields include:

- Material
- Dimensions
- Finish
- Use
- Care
- Availability

### `writing`

Useful for writing projects, zines, booklets, small publications or text-based works.

Generated starter fields include:

- Format
- Genre
- Language
- Length
- Reading status
- Availability
- Notes

## Unknown presets

Unknown presets fail with a clear message and list the available presets.

This keeps generated YAML predictable and easy to validate.

## Validation

After creating or editing items, run:

```bash
npm run item:validate
```
