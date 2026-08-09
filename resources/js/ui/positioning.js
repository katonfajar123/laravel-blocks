const placements = new Set([
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]);

function round(value) {
  return `${Math.round(value)}px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizePopoverPlacement(placement = 'bottom-start') {
  return placements.has(placement) ? placement : 'bottom-start';
}

export function computePopoverStyle({
  anchorRect,
  popoverRect = { width: 0, height: 0 },
  placement = 'bottom-start',
  offset = 8,
  viewportWidth = 1024,
  viewportHeight = 768,
  viewportPadding = 8,
} = {}) {
  if (!anchorRect) {
    return Object.freeze({
      position: 'fixed',
      top: round(viewportPadding),
      left: round(viewportPadding),
    });
  }

  const normalized = normalizePopoverPlacement(placement);
  const [side, align = 'center'] = normalized.split('-');
  const popoverWidth = popoverRect.width ?? 0;
  const popoverHeight = popoverRect.height ?? 0;
  let top = anchorRect.bottom + offset;
  let left = anchorRect.left;

  if (side === 'top') {
    top = anchorRect.top - popoverHeight - offset;
  }

  if (side === 'left' || side === 'right') {
    top = anchorRect.top;
    left = side === 'left'
      ? anchorRect.left - popoverWidth - offset
      : anchorRect.right + offset;
  }

  if (side === 'top' || side === 'bottom') {
    if (align === 'end') {
      left = anchorRect.right - popoverWidth;
    } else if (align === 'center') {
      left = anchorRect.left + ((anchorRect.width ?? 0) / 2) - (popoverWidth / 2);
    }
  }

  if (side === 'left' || side === 'right') {
    if (align === 'end') {
      top = anchorRect.bottom - popoverHeight;
    } else if (align === 'center') {
      top = anchorRect.top + ((anchorRect.height ?? 0) / 2) - (popoverHeight / 2);
    }
  }

  return Object.freeze({
    position: 'fixed',
    top: round(clamp(top, viewportPadding, viewportHeight - popoverHeight - viewportPadding)),
    left: round(clamp(left, viewportPadding, viewportWidth - popoverWidth - viewportPadding)),
  });
}
