function plainRect(rect) {
  return Object.freeze({
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  });
}

function labelForType(type) {
  return String(type ?? '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || 'Block';
}

export function createEmptyBlockSelection() {
  return Object.freeze({
    active: false,
    attrs: Object.freeze({}),
    canMoveDown: false,
    canMoveUp: false,
    depth: 0,
    from: 0,
    index: -1,
    label: 'Block',
    siblingCount: 0,
    text: '',
    to: 0,
    type: 'unknown',
  });
}

export function createBlockSelectionState(editor) {
  const selection = editor?.state?.selection;

  if (!selection?.$from) {
    return createEmptyBlockSelection();
  }

  const cursor = selection.$from;

  for (let depth = cursor.depth; depth > 0; depth -= 1) {
    const node = cursor.node(depth);

    if (!node?.isBlock) {
      continue;
    }

    const parent = cursor.node(depth - 1);
    const index = cursor.index(depth - 1);
    const from = cursor.before(depth);
    const to = from + node.nodeSize;
    const siblingCount = parent?.childCount ?? 0;

    return Object.freeze({
      active: true,
      attrs: Object.freeze({ ...(node.attrs ?? {}) }),
      canMoveDown: index < siblingCount - 1,
      canMoveUp: index > 0,
      depth,
      from,
      index,
      label: labelForType(node.type?.name),
      siblingCount,
      text: node.textContent ?? '',
      to,
      type: node.type?.name ?? 'unknown',
    });
  }

  return createEmptyBlockSelection();
}

export function blockElement(editor, block) {
  if (!block?.active || !editor?.view?.nodeDOM) {
    return null;
  }

  const candidate = editor.view.nodeDOM(block.from);

  return candidate instanceof Element ? candidate : null;
}

export function blockRect(editor, block) {
  const element = blockElement(editor, block);

  if (element) {
    return plainRect(element.getBoundingClientRect());
  }

  if (!block?.active || !editor?.view?.coordsAtPos) {
    return null;
  }

  try {
    const start = editor.view.coordsAtPos(Math.max(1, block.from + 1));
    const end = editor.view.coordsAtPos(Math.max(1, block.to - 1));

    return Object.freeze({
      bottom: Math.max(start.bottom, end.bottom),
      height: Math.max(1, Math.max(start.bottom, end.bottom) - Math.min(start.top, end.top)),
      left: Math.min(start.left, end.left),
      right: Math.max(start.right, end.right),
      top: Math.min(start.top, end.top),
      width: Math.max(1, Math.max(start.right, end.right) - Math.min(start.left, end.left)),
    });
  } catch {
    return null;
  }
}

export function blockFrameStyle({
  block,
  editor,
  padding = 6,
} = {}) {
  const rect = blockRect(editor, block);

  if (!rect) {
    return Object.freeze({});
  }

  return Object.freeze({
    height: `${Math.round(rect.height + (padding * 2))}px`,
    left: `${Math.round(rect.left - padding)}px`,
    position: 'fixed',
    top: `${Math.round(rect.top - padding)}px`,
    width: `${Math.round(rect.width + (padding * 2))}px`,
  });
}

export function blockToolbarStyle({
  block,
  editor,
  offset = 10,
  toolbarRect = { height: 40, width: 240 },
  viewportPadding = 8,
} = {}) {
  const rect = blockRect(editor, block);

  if (!rect) {
    return Object.freeze({});
  }

  const viewportWidth = globalThis.window?.innerWidth ?? 1024;
  const top = Math.max(viewportPadding, rect.top - (toolbarRect.height ?? 40) - offset);
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    viewportWidth - (toolbarRect.width ?? 240) - viewportPadding,
  );

  return Object.freeze({
    left: `${Math.round(left)}px`,
    position: 'fixed',
    top: `${Math.round(top)}px`,
  });
}
