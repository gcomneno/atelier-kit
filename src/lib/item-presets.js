export const PLACEHOLDER_IMAGE = '/images/items/placeholder.svg';

/** @type {{ id: string, label: string }[]} */
export const ITEM_PRESET_OPTIONS = [
  { id: 'default', label: 'General object' },
  { id: 'handmade', label: 'Handmade / craft' },
  { id: 'artwork', label: 'Artwork / visual art' },
  { id: 'jewelry', label: 'Jewelry' },
  { id: 'print', label: 'Print / edition' },
  { id: 'furniture', label: 'Furniture / object design' },
  { id: 'writing', label: 'Writing / creative project' }
];

/** @type {Record<string, unknown[]>} */
export const META_PRESETS = {
  default: [
    { label: 'Material', value: 'Replace with material' },
    { label: 'Dimensions', value: 'Replace with dimensions' },
    { label: 'Availability', value: 'Replace with availability' },
    {
      label: 'Object details',
      children: [
        { label: 'Finish', value: 'Replace with finish' },
        { label: 'Care', value: 'Replace with care instructions' }
      ]
    }
  ],

  handmade: [
    { label: 'Material', value: 'Replace with material' },
    { label: 'Dimensions', value: 'Replace with dimensions' },
    { label: 'Finish', value: 'Replace with finish' },
    { label: 'Care', value: 'Replace with care instructions' },
    { label: 'Availability', value: 'Replace with availability' },
    {
      label: 'Object details',
      children: [
        { label: 'Technique', value: 'Replace with technique' },
        { label: 'Made in', value: 'Replace with origin or studio note' }
      ]
    }
  ],

  artwork: [
    { label: 'Technique', value: 'Replace with technique' },
    { label: 'Support', value: 'Replace with support' },
    { label: 'Dimensions', value: 'Replace with dimensions' },
    { label: 'Year', value: 'Replace with year' },
    { label: 'Frame', value: 'Replace with frame details' },
    { label: 'Availability', value: 'Replace with availability' },
    { label: 'Notes', value: 'Replace with artwork notes' }
  ],

  jewelry: [
    { label: 'Material', value: 'Replace with material' },
    { label: 'Size', value: 'Replace with size' },
    { label: 'Finish', value: 'Replace with finish' },
    { label: 'Stone or detail', value: 'Replace with stone or detail' },
    { label: 'Care', value: 'Replace with care instructions' },
    { label: 'Availability', value: 'Replace with availability' }
  ],

  print: [
    { label: 'Print technique', value: 'Replace with print technique' },
    { label: 'Paper', value: 'Replace with paper type' },
    { label: 'Size', value: 'Replace with size' },
    { label: 'Edition', value: 'Replace with edition details' },
    { label: 'Frame', value: 'Replace with frame option' },
    { label: 'Availability', value: 'Replace with availability' }
  ],

  furniture: [
    { label: 'Material', value: 'Replace with material' },
    { label: 'Dimensions', value: 'Replace with dimensions' },
    { label: 'Finish', value: 'Replace with finish' },
    { label: 'Use', value: 'Replace with intended use' },
    { label: 'Care', value: 'Replace with care instructions' },
    { label: 'Availability', value: 'Replace with availability' }
  ],

  writing: [
    { label: 'Format', value: 'Replace with format' },
    { label: 'Genre', value: 'Replace with genre' },
    { label: 'Language', value: 'Replace with language' },
    { label: 'Length', value: 'Replace with length' },
    { label: 'Reading status', value: 'Replace with reading status' },
    { label: 'Availability', value: 'Replace with availability' },
    { label: 'Notes', value: 'Replace with writing notes' }
  ]
};

/**
 * @param {string} preset
 */
export function normalizeItemPreset(preset) {
  return Object.hasOwn(META_PRESETS, preset) ? preset : 'default';
}

/**
 * @param {string} id
 */
export function titleFromItemId(id) {
  return id
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * @param {string} id
 * @param {string} title
 * @param {string} [preset]
 * @param {{ description?: string, notice?: string }} [options]
 */
export function buildNewItemRecord(id, title, preset = 'default', options = {}) {
  const presetId = normalizeItemPreset(preset);
  const meta = META_PRESETS[presetId];

  return {
    id,
    title,
    subtitle: '',
    status: 'draft',
    price_mode: 'hidden',
    image_file: PLACEHOLDER_IMAGE,
    image_alt: '',
    description: options.description || 'Replace with a real description.',
    notice: options.notice ?? 'Draft item. Replace before publishing.',
    meta: structuredClone(meta)
  };
}
