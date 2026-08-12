function freezeState(state) {
  return Object.freeze({
    active: Boolean(state.active),
    draggingIndex: Number.isInteger(state.draggingIndex) ? state.draggingIndex : -1,
    indicatorRect: state.indicatorRect ? Object.freeze({ ...state.indicatorRect }) : null,
    placement: state.placement ?? 'none',
    reason: state.reason ?? null,
    targetIndex: Number.isInteger(state.targetIndex) ? state.targetIndex : -1,
    valid: Boolean(state.valid),
  });
}

function labelForType(type) {
  return String(type ?? '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || 'Block';
}

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

function targetIsElement(target) {
  return Boolean(
    target
    && typeof target === 'object'
    && typeof target.getBoundingClientRect === 'function',
  );
}

function canvasContains(canvas, target) {
  if (!canvas || !target) {
    return false;
  }

  if (typeof canvas.contains === 'function') {
    return canvas.contains(target);
  }

  return canvas === target;
}

export function createEmptyBlockDragState() {
  return freezeState({
    active: false,
    draggingIndex: -1,
    indicatorRect: null,
    placement: 'none',
    reason: null,
    targetIndex: -1,
    valid: false,
  });
}

export function createBlockDragState(block, reason = 'Choose a top-level drop target.') {
  if (!block?.active || block.depth !== 1 || !Number.isInteger(block.index)) {
    return freezeState({
      active: false,
      draggingIndex: -1,
      indicatorRect: null,
      placement: 'none',
      reason: 'Only top-level blocks can be dragged in this release.',
      targetIndex: -1,
      valid: false,
    });
  }

  return freezeState({
    active: true,
    draggingIndex: block.index,
    indicatorRect: null,
    placement: 'none',
    reason,
    targetIndex: -1,
    valid: false,
  });
}

export function topLevelBlockRanges(editor) {
  const doc = editor?.state?.doc;

  if (!doc || !Number.isInteger(doc.childCount)) {
    return Object.freeze([]);
  }

  const ranges = [];
  let from = 0;

  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index);
    const nodeSize = Number(node?.nodeSize ?? 0);

    if (nodeSize <= 0) {
      continue;
    }

    if (node?.isBlock) {
      ranges.push(Object.freeze({
        from,
        index,
        label: labelForType(node.type?.name),
        nodeSize,
        to: from + nodeSize,
        type: node.type?.name ?? 'unknown',
      }));
    }

    from += nodeSize;
  }

  return Object.freeze(ranges);
}

export function topLevelBlockRects(editor) {
  return Object.freeze(topLevelBlockRanges(editor)
    .map((range) => {
      const element = editor?.view?.nodeDOM?.(range.from);

      if (!targetIsElement(element)) {
        return null;
      }

      return Object.freeze({
        ...range,
        rect: plainRect(element.getBoundingClientRect()),
      });
    })
    .filter(Boolean));
}

export function dropTargetFromRects({
  block,
  clientY,
  rects,
} = {}) {
  const dragging = createBlockDragState(block);

  if (!dragging.active) {
    return dragging;
  }

  if (!Array.isArray(rects) || rects.length === 0) {
    return freezeState({
      ...dragging,
      reason: 'No top-level drop targets are available.',
    });
  }

  const y = Number(clientY);

  if (!Number.isFinite(y)) {
    return freezeState({
      ...dragging,
      reason: 'Drop target position is unavailable.',
    });
  }

  let targetIndex = rects.length;
  let placement = 'after';
  let indicatorRect = rects.at(-1).rect;

  for (const candidate of rects) {
    const midpoint = candidate.rect.top + (candidate.rect.height / 2);

    if (y < midpoint) {
      targetIndex = candidate.index;
      placement = 'before';
      indicatorRect = candidate.rect;

      break;
    }

    if (y <= candidate.rect.bottom) {
      targetIndex = candidate.index + 1;
      placement = 'after';
      indicatorRect = candidate.rect;

      break;
    }
  }

  if (targetIndex === block.index || targetIndex === block.index + 1) {
    return freezeState({
      ...dragging,
      indicatorRect,
      placement,
      reason: 'Drop would keep the block in the same position.',
      targetIndex,
    });
  }

  return freezeState({
    ...dragging,
    indicatorRect,
    placement,
    reason: null,
    targetIndex,
    valid: true,
  });
}

export function topLevelDropTarget({
  block,
  clientY,
  editor,
  eventTarget,
} = {}) {
  const dragging = createBlockDragState(block);
  const canvas = editor?.view?.dom;

  if (!dragging.active) {
    return dragging;
  }

  if (!canvasContains(canvas, eventTarget)) {
    return freezeState({
      ...dragging,
      indicatorRect: topLevelBlockRects(editor).find((item) => item.index === block.index)?.rect ?? null,
      reason: 'Drop inside the top-level canvas.',
    });
  }

  return dropTargetFromRects({
    block,
    clientY,
    rects: topLevelBlockRects(editor),
  });
}

export function dropIndicatorStyle(state, fallbackRect = null) {
  if (!state?.active) {
    return Object.freeze({});
  }

  const rect = state.indicatorRect ?? fallbackRect;

  if (!rect) {
    return Object.freeze({});
  }

  const top = state.placement === 'after' ? rect.bottom : rect.top;

  return Object.freeze({
    left: `${Math.round(rect.left)}px`,
    position: 'fixed',
    top: `${Math.round(top)}px`,
    width: `${Math.max(24, Math.round(rect.width))}px`,
  });
}
