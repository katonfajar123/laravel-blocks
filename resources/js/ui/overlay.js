function focusElement(element) {
  if (typeof element?.focus !== 'function') {
    return;
  }

  element.focus({ preventScroll: true });
}

export function targetIsInside(target, elements) {
  return elements.some((element) => {
    if (!element) {
      return false;
    }

    if (target === element) {
      return true;
    }

    return typeof element.contains === 'function' && element.contains(target);
  });
}

export function createOverlayController({
  ownerDocument = globalThis.document,
  containsTarget = () => false,
  onDismiss = () => {},
  restoreFocus = true,
} = {}) {
  let open = false;
  let invoker = null;

  function close(options = {}) {
    if (!open) {
      return;
    }

    open = false;
    ownerDocument?.removeEventListener?.('keydown', handleKeydown);
    ownerDocument?.removeEventListener?.('pointerdown', handlePointerDown, true);

    if ((options.restoreFocus ?? restoreFocus) && invoker) {
      focusElement(invoker);
    }
  }

  function dismiss(reason, event) {
    onDismiss(reason, event);
    close();
  }

  function handleKeydown(event) {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault?.();
    dismiss('escape', event);
  }

  function handlePointerDown(event) {
    if (containsTarget(event.target)) {
      return;
    }

    event.preventDefault?.();
    dismiss('outside-pointer', event);
  }

  return Object.freeze({
    close,
    destroy() {
      close({ restoreFocus: false });
    },
    handleKeydown,
    handlePointerDown,
    isOpen() {
      return open;
    },
    open(invokingElement = null) {
      invoker = invokingElement ?? invoker;

      if (open) {
        return;
      }

      open = true;
      ownerDocument?.addEventListener?.('keydown', handleKeydown);
      ownerDocument?.addEventListener?.('pointerdown', handlePointerDown, true);
    },
  });
}
