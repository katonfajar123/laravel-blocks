import { createOverlayController, targetIsInside } from './overlay.js';
import { computePopoverStyle, normalizePopoverPlacement } from './positioning.js';

function viewport(ownerDocument) {
  return {
    height: ownerDocument?.defaultView?.innerHeight ?? 768,
    width: ownerDocument?.defaultView?.innerWidth ?? 1024,
  };
}

export function createPopoverController({
  anchor = null,
  offset = 8,
  onClose = () => {},
  onOpen = () => {},
  ownerDocument = null,
  placement = 'bottom-start',
  popover,
  restoreFocus = true,
} = {}) {
  if (!popover) {
    throw new TypeError('A popover element is required.');
  }

  let currentAnchor = anchor;
  let open = false;
  const document = ownerDocument ?? popover.ownerDocument ?? globalThis.document;
  const overlay = createOverlayController({
    ownerDocument: document,
    restoreFocus,
    containsTarget(target) {
      return targetIsInside(target, [currentAnchor, popover]);
    },
    onDismiss(reason, event) {
      close(reason, event);
    },
  });

  function updatePosition() {
    const anchorRect = currentAnchor?.getBoundingClientRect?.();
    const popoverRect = popover.getBoundingClientRect?.() ?? { width: 0, height: 0 };
    const size = viewport(document);
    const style = computePopoverStyle({
      anchorRect,
      popoverRect,
      placement,
      offset,
      viewportHeight: size.height,
      viewportWidth: size.width,
    });

    Object.assign(popover.style, style);
    popover.dataset.laravelBlocksPlacement = normalizePopoverPlacement(placement);

    return style;
  }

  function close(reason = 'programmatic', event = null) {
    if (!open) {
      return;
    }

    open = false;
    popover.hidden = true;
    popover.dataset.laravelBlocksState = 'closed';
    overlay.close();
    onClose(reason, event);
  }

  function openPopover(invokingElement = currentAnchor) {
    currentAnchor = invokingElement ?? currentAnchor;
    open = true;
    popover.hidden = false;
    popover.dataset.laravelBlocksState = 'open';
    updatePosition();
    overlay.open(currentAnchor);
    onOpen();
  }

  return Object.freeze({
    close,
    destroy() {
      overlay.destroy();
      popover.hidden = true;
      popover.dataset.laravelBlocksState = 'closed';
    },
    isOpen() {
      return open;
    },
    open: openPopover,
    toggle(invokingElement = currentAnchor) {
      if (open) {
        close('toggle');

        return;
      }

      openPopover(invokingElement);
    },
    updatePosition,
  });
}
