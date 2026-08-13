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

  if (cursor.depth === 0 && editor?.state?.doc?.childCount > 0) {
    const node = editor.state.doc.child(0);

    if (node?.isBlock) {
      return Object.freeze({
        active: true,
        attrs: Object.freeze({ ...(node.attrs ?? {}) }),
        canMoveDown: editor.state.doc.childCount > 1,
        canMoveUp: false,
        depth: 1,
        from: 0,
        index: 0,
        label: labelForType(node.type?.name),
        siblingCount: editor.state.doc.childCount,
        text: node.textContent ?? '',
        to: node.nodeSize,
        type: node.type?.name ?? 'unknown',
      });
    }
  }

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

export function createTopLevelBlockSelectionState(editor, index) {
  const doc = editor?.state?.doc;
  const normalizedIndex = Number(index);

  if (
    !doc
    || !Number.isInteger(normalizedIndex)
    || normalizedIndex < 0
    || normalizedIndex >= doc.childCount
  ) {
    return createEmptyBlockSelection();
  }

  const node = doc.child(normalizedIndex);

  if (!node?.isBlock) {
    return createEmptyBlockSelection();
  }

  let from = 0;

  for (let childIndex = 0; childIndex < normalizedIndex; childIndex += 1) {
    from += Number(doc.child(childIndex)?.nodeSize ?? 0);
  }

  return Object.freeze({
    active: true,
    attrs: Object.freeze({ ...(node.attrs ?? {}) }),
    canMoveDown: normalizedIndex < doc.childCount - 1,
    canMoveUp: normalizedIndex > 0,
    depth: 1,
    from,
    index: normalizedIndex,
    label: labelForType(node.type?.name),
    siblingCount: doc.childCount,
    text: node.textContent ?? '',
    to: from + node.nodeSize,
    type: node.type?.name ?? 'unknown',
  });
}

export function createTopLevelHoverBlockSelectionState(editor, canvas, target) {
  const isElement = typeof Element !== 'undefined' && target instanceof Element;

  if (!canvas || !target || !isElement || !canvas.contains(target)) {
    return createEmptyBlockSelection();
  }

  let element = target;

  while (element && element.parentElement !== canvas) {
    element = element.parentElement;
  }

  if (!element || element.parentElement !== canvas) {
    return createEmptyBlockSelection();
  }

  const index = Array.prototype.indexOf.call(canvas.children, element);

  return createTopLevelBlockSelectionState(editor, index);
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
  const toolbarHeight = toolbarRect.height ?? 40;
  const stickyHeader = globalThis.document?.querySelector?.('[data-laravel-blocks-editor-header]');
  const stickyHeaderBottom = stickyHeader?.getBoundingClientRect?.().bottom ?? 0;
  const minimumTop = Math.max(viewportPadding, stickyHeaderBottom + viewportPadding);
  const preferredTop = rect.top - toolbarHeight - offset;
  const top = preferredTop < minimumTop ? minimumTop : preferredTop;
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
