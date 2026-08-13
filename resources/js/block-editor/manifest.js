const supportedInsertPayloads = Object.freeze({
  blockquote: () => ({
    type: 'blockquote',
    content: [{ type: 'paragraph' }],
  }),
  bulletList: () => ({
    type: 'bulletList',
    content: [{
      type: 'listItem',
      content: [{ type: 'paragraph' }],
    }],
  }),
  codeBlock: () => ({ type: 'codeBlock' }),
  heading: () => ({
    type: 'heading',
    attrs: { level: 2 },
  }),
  image: () => ({
    type: 'image',
    attrs: { src: null, alt: null, title: null },
  }),
  orderedList: () => ({
    type: 'orderedList',
    attrs: { start: 1, type: null },
    content: [{
      type: 'listItem',
      content: [{ type: 'paragraph' }],
    }],
  }),
  paragraph: () => ({ type: 'paragraph' }),
});

function normalizeCategory(category) {
  const name = String(category?.name || 'blocks');

  return Object.freeze({
    label: String(category?.label || name)
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    name,
  });
}

function normalizeBlock(block, categories) {
  const name = String(block?.name || '');
  const supported = Object.hasOwn(supportedInsertPayloads, name);
  const inserterEnabled = block?.supports?.inserter !== false;
  const category = categories.get(block?.category) ?? normalizeCategory({ name: block?.category || 'blocks' });

  if (!inserterEnabled) {
    return null;
  }

  return Object.freeze({
    category: category.name,
    categoryLabel: category.label,
    description: block?.description ? String(block.description) : '',
    disabledReason: supported ? null : 'This block is not supported by the current editor bundle yet.',
    icon: block?.icon ? String(block.icon) : null,
    keywords: Array.isArray(block?.keywords) ? block.keywords.map(String) : [],
    label: String(block?.label || name || 'Block'),
    name,
    supported,
  });
}

export function normalizeEditorManifest(manifest = {}) {
  const categories = new Map(
    (Array.isArray(manifest.categories) ? manifest.categories : [])
      .map(normalizeCategory)
      .map((category) => [category.name, category]),
  );

  const blocks = (Array.isArray(manifest.blocks) ? manifest.blocks : [])
    .map((block) => normalizeBlock(block, categories))
    .filter((block) => block !== null && block.name !== '');

  return Object.freeze({
    blocks: Object.freeze(blocks),
    categories: Object.freeze([...categories.values()]),
    documentSchemaVersion: Number(manifest.documentSchemaVersion || 1),
    manifestVersion: Number(manifest.manifestVersion || 1),
  });
}

export function blockInserterItems(manifest = {}) {
  return normalizeEditorManifest(manifest).blocks;
}

export function filterBlockInserterItems(items, query = '') {
  const search = String(query ?? '').trim().toLowerCase();

  if (search === '') {
    return Object.freeze([...items]);
  }

  return Object.freeze(items.filter((item) => [
    item.name,
    item.label,
    item.description,
    item.categoryLabel,
    ...item.keywords,
  ].some((value) => String(value).toLowerCase().includes(search))));
}

export function blockInsertPayload(item) {
  const factory = supportedInsertPayloads[item?.name];

  if (!factory || item?.supported === false) {
    return Object.freeze({
      node: null,
      reason: item?.disabledReason || 'This block cannot be inserted.',
      valid: false,
    });
  }

  return Object.freeze({
    node: factory(),
    reason: null,
    valid: true,
  });
}
