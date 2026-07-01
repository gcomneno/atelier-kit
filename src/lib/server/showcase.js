import { parse } from 'yaml';

const configFiles = import.meta.glob('/config/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

const itemFiles = import.meta.glob('/content/items/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * @typedef {{ label: string, value?: string, children?: MetaInfoEntry[] }} MetaInfoEntry
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {string} source
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
function parseYaml(source, raw) {
  const data = parse(raw);

  if (!isRecord(data)) {
    throw new Error(`${source} must contain a YAML object.`);
  }

  return data;
}

/**
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
function readYaml(source) {
  const raw = configFiles[source];

  if (typeof raw !== 'string') {
    throw new Error(`Missing YAML file: ${source}`);
  }

  return parseYaml(source, raw);
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @param {string} source
 * @returns {string}
 */
function requiredString(record, field, source) {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${source}: missing or invalid "${field}".`);
  }

  return value.trim();
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} field
 * @param {string} [fallback]
 * @returns {string}
 */
function optionalString(record, field, fallback = '') {
  const value = record[field];

  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

/**
 * @param {unknown} entries
 * @param {string} source
 * @returns {MetaInfoEntry[]}
 */
function normalizeMetaEntries(entries, source) {
  if (entries === undefined) {
    return [];
  }

  if (!Array.isArray(entries)) {
    throw new Error(`${source}: "meta" must be an array when provided.`);
  }

  return entries.map((entry, index) => normalizeMetaEntry(entry, `${source}:meta[${index}]`));
}

/**
 * @param {unknown} entry
 * @param {string} source
 * @returns {MetaInfoEntry}
 */
function normalizeMetaEntry(entry, source) {
  if (!isRecord(entry)) {
    throw new Error(`${source}: meta entry must be an object.`);
  }

  const label = requiredString(entry, 'label', source);
  const value = optionalString(entry, 'value');
  const children = normalizeMetaEntries(entry.children, `${source}.children`);

  if (!value && children.length === 0) {
    throw new Error(`${source}: meta entry must have either "value" or "children".`);
  }

  return {
    label,
    ...(value ? { value } : {}),
    ...(children.length > 0 ? { children } : {})
  };
}

/**
 * @param {MetaInfoEntry[]} entries
 * @param {string} label
 * @returns {string}
 */
function findMetaValue(entries, label) {
  const wanted = label.toLowerCase();

  for (const entry of entries) {
    if (entry.label.toLowerCase() === wanted && entry.value) {
      return entry.value;
    }

    if (entry.children) {
      const value = findMetaValue(entry.children, label);

      if (value) {
        return value;
      }
    }
  }

  return '';
}

export function getSiteConfig() {
  const data = readYaml('/config/site.yaml');
  const site = data.site;

  if (!isRecord(site)) {
    throw new Error('config/site.yaml: missing "site" object.');
  }

  return {
    name: requiredString(site, 'name', 'config/site.yaml'),
    tagline: requiredString(site, 'tagline', 'config/site.yaml'),
    language: optionalString(site, 'language', 'en'),
    notice: optionalString(site, 'notice'),
    footer_note: optionalString(site, 'footer_note')
  };
}

export function getCatalogConfig() {
  const data = readYaml('/config/catalog.yaml');
  const catalog = data.catalog;

  if (!isRecord(catalog)) {
    throw new Error('config/catalog.yaml: missing "catalog" object.');
  }

  const fields = isRecord(catalog.fields) ? catalog.fields : {};

  return {
    item_name_singular: requiredString(catalog, 'item_name_singular', 'config/catalog.yaml'),
    item_name_plural: requiredString(catalog, 'item_name_plural', 'config/catalog.yaml'),
    fields: {
      show_price: fields.show_price === true,
      show_availability: fields.show_availability !== false,
      show_material: fields.show_material !== false,
      show_dimensions: fields.show_dimensions !== false,
      show_status: fields.show_status !== false,
      show_meta: fields.show_meta !== false
    }
  };
}

export function getSignalClouds() {
  const data = readYaml('/config/signal-clouds.yaml');
  const clouds = data.signal_clouds;

  if (!Array.isArray(clouds)) {
    throw new Error('config/signal-clouds.yaml: missing "signal_clouds" array.');
  }

  return clouds.map((cloud, cloudIndex) => {
    const source = `config/signal-clouds.yaml:signal_clouds[${cloudIndex}]`;

    if (!isRecord(cloud)) {
      throw new Error(`${source}: cloud must be an object.`);
    }

    if (!Array.isArray(cloud.options) || cloud.options.length === 0) {
      throw new Error(`${source}: options must be a non-empty array.`);
    }

    return {
      id: requiredString(cloud, 'id', source),
      question: requiredString(cloud, 'question', source),
      options: cloud.options.map((option, optionIndex) => {
        const optionSource = `${source}.options[${optionIndex}]`;

        if (!isRecord(option)) {
          throw new Error(`${optionSource}: option must be an object.`);
        }

        return {
          id: requiredString(option, 'id', optionSource),
          label: requiredString(option, 'label', optionSource)
        };
      })
    };
  });
}


export function getContactConfig() {
  const data = readYaml('/config/contact.yaml');
  const contact = data.contact;

  if (!isRecord(contact)) {
    return {
      email: {
        enabled: false,
        label: 'Email this brief',
        address: '',
        subject_prefix: 'Interest in'
      },
      whatsapp: {
        enabled: false,
        label: 'WhatsApp this brief',
        phone: ''
      }
    };
  }

  const email = isRecord(contact.email) ? contact.email : {};
  const whatsapp = isRecord(contact.whatsapp) ? contact.whatsapp : {};

  const emailAddress = optionalString(email, 'address');
  const whatsappPhone = optionalString(whatsapp, 'phone');

  return {
    email: {
      enabled: email.enabled === true && emailAddress !== '',
      label: optionalString(email, 'label', 'Email this brief'),
      address: emailAddress,
      subject_prefix: optionalString(email, 'subject_prefix', 'Interest in')
    },
    whatsapp: {
      enabled: whatsapp.enabled === true && whatsappPhone !== '',
      label: optionalString(whatsapp, 'label', 'WhatsApp this brief'),
      phone: whatsappPhone
    }
  };
}


export function getItems() {
  return Object.entries(itemFiles)
    .map(([source, raw]) => {
      if (typeof raw !== 'string') {
        throw new Error(`${source}: expected raw YAML content.`);
      }

      const item = parseYaml(source, raw);
      const meta = normalizeMetaEntries(item.meta, source);

      return {
        id: requiredString(item, 'id', source),
        title: requiredString(item, 'title', source),
        subtitle: optionalString(item, 'subtitle'),
        status: optionalString(item, 'status'),
        price_mode: optionalString(item, 'price_mode'),
        image_file: requiredString(item, 'image_file', source),
        image_alt: optionalString(item, 'image_alt'),
        description: requiredString(item, 'description', source),
        notice: optionalString(item, 'notice'),
        material: optionalString(item, 'material') || findMetaValue(meta, 'Material'),
        dimensions: optionalString(item, 'dimensions') || findMetaValue(meta, 'Dimensions'),
        availability: optionalString(item, 'availability') || findMetaValue(meta, 'Availability'),
        meta
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {string} id
 */
export function getItemById(id) {
  return getItems().find((item) => item.id === id);
}
