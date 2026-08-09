const CURRENT_SCHEMA_VERSION = 1;

export const emptyDocument = Object.freeze({
  type: 'doc',
  attrs: Object.freeze({
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }),
  content: Object.freeze([]),
});

export function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeDocument(value) {
  if (value === null || typeof value === 'undefined') {
    return cloneJsonValue(emptyDocument);
  }

  const root = typeof value === 'string' ? JSON.parse(value) : value;

  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    throw new TypeError('Laravel Blocks editor payload must be a document object.');
  }

  if (root.type !== 'doc') {
    throw new TypeError('Laravel Blocks editor payload root type must be "doc".');
  }

  const schemaVersion = root.attrs?.schemaVersion;

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new TypeError('Laravel Blocks editor payload schema version is unsupported.');
  }

  if (typeof root.content !== 'undefined' && !Array.isArray(root.content)) {
    throw new TypeError('Laravel Blocks editor payload content must be a list.');
  }

  return {
    type: 'doc',
    attrs: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    content: cloneJsonValue(root.content ?? []),
  };
}

export function toTiptapDocument(value) {
  const document = normalizeDocument(value);

  return {
    type: 'doc',
    content: document.content,
  };
}

export function toCanonicalDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return cloneJsonValue(emptyDocument);
  }

  return {
    type: 'doc',
    attrs: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    content: Array.isArray(value.content) ? cloneJsonValue(value.content) : [],
  };
}

export function toCanonicalJson(value) {
  return JSON.stringify(toCanonicalDocument(value));
}
