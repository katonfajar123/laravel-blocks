const groups = ['content', 'design', 'advanced'];

function nestedValue(source, path) {
  const segments = String(path ?? '').split('.').filter(Boolean);
  const effective = segments[0] === 'attrs' ? segments.slice(1) : segments;

  return effective.reduce(
    (value, segment) => (value && typeof value === 'object' ? value[segment] : undefined),
    source,
  );
}

export function blockManifestDefinition(manifest, block) {
  if (!block?.active || !Array.isArray(manifest?.blocks)) {
    return null;
  }

  return manifest.blocks.find((candidate) => candidate.name === block.type) ?? null;
}

export function inspectorFieldsForBlock(manifest, block, group = 'content') {
  const definition = blockManifestDefinition(manifest, block);

  if (!definition || !groups.includes(group)) {
    return Object.freeze([]);
  }

  return Object.freeze((Array.isArray(definition.fields) ? definition.fields : [])
    .filter((field) => (field.group || 'content') === group)
    .map((field) => Object.freeze({
      constraints: field.constraints && typeof field.constraints === 'object' ? field.constraints : {},
      default: field.default ?? '',
      group: field.group || 'content',
      help: field.help || null,
      label: field.label || field.name || 'Field',
      name: field.name,
      path: field.path || `attrs.${field.name}`,
      required: Boolean(field.required),
      type: field.type || 'text',
      ui: field.ui && typeof field.ui === 'object' ? field.ui : {},
    })));
}

export function inspectorFieldValue(block, field) {
  const value = nestedValue(block?.attrs ?? {}, field?.path);

  return value ?? field?.default ?? '';
}

export function coerceInspectorFieldValue(field, raw) {
  if (field?.type === 'checkbox' || field?.type === 'toggle') {
    return Boolean(raw);
  }

  if (field?.constraints?.nullable && String(raw ?? '').trim() === '') {
    return null;
  }

  if (field?.type === 'number' || field?.type === 'range') {
    const number = Number(raw);

    return Number.isFinite(number) ? number : null;
  }

  const allowed = field?.constraints?.allowedValues;

  if (Array.isArray(allowed)) {
    const candidate = allowed.find((value) => String(value) === String(raw));

    return candidate ?? raw;
  }

  return String(raw ?? '');
}

export function inspectorGroups() {
  return Object.freeze([
    { name: 'content', label: 'Content' },
    { name: 'design', label: 'Design' },
    { name: 'advanced', label: 'Advanced' },
  ]);
}
