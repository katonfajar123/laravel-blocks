import { Teleport, h, nextTick, onBeforeUnmount, ref, watch } from 'vue';

function focusableElements(container) {
  if (!container?.querySelectorAll) {
    return [];
  }

  return [...container.querySelectorAll([
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))].filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

export const Modal = {
  name: 'LaravelBlocksModal',
  props: {
    closeOnBackdrop: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      required: true,
    },
    open: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close'],
  setup(props, { emit, expose, slots }) {
    const panel = ref(null);
    let bodyOverflow = null;
    let invokingElement = null;

    function announce(type) {
      globalThis.document?.dispatchEvent?.(new CustomEvent(`laravel-blocks:overlay-${type}`, {
        detail: { type: 'modal' },
      }));
    }

    function focusInitial() {
      const elements = focusableElements(panel.value);
      const preferred = panel.value?.querySelector?.('[data-laravel-blocks-modal-initial-focus]');
      const target = preferred && elements.includes(preferred) ? preferred : elements[0];

      target?.focus?.({ preventScroll: true });
    }

    function restoreFocus() {
      if (invokingElement?.isConnected) {
        invokingElement.focus?.({ preventScroll: true });
      }

      invokingElement = null;
    }

    function lockBodyScroll() {
      const body = globalThis.document?.body;

      if (!body || bodyOverflow !== null) {
        return;
      }

      bodyOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }

    function unlockBodyScroll() {
      const body = globalThis.document?.body;

      if (!body || bodyOverflow === null) {
        return;
      }

      body.style.overflow = bodyOverflow;
      bodyOverflow = null;
    }

    function close(reason) {
      emit('close', reason);
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close('escape');

        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements(panel.value);

      if (elements.length === 0) {
        event.preventDefault();
        panel.value?.focus?.({ preventScroll: true });

        return;
      }

      const first = elements[0];
      const last = elements.at(-1);
      const active = globalThis.document?.activeElement;

      if (!panel.value?.contains?.(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });

        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    watch(() => props.open, async (open, previous) => {
      if (open) {
        invokingElement = globalThis.document?.activeElement ?? null;
        lockBodyScroll();
        globalThis.document?.addEventListener?.('keydown', handleKeydown, true);
        announce('open');
        await nextTick();
        focusInitial();
      } else if (previous) {
        announce('close');
        globalThis.document?.removeEventListener?.('keydown', handleKeydown, true);
        unlockBodyScroll();
        await nextTick();
        restoreFocus();
      }
    }, { immediate: true });

    onBeforeUnmount(() => {
      if (props.open) {
        announce('close');
        globalThis.document?.removeEventListener?.('keydown', handleKeydown, true);
        unlockBodyScroll();
        restoreFocus();
      }
    });

    expose({ close, focusInitial, panel });

    return () => props.open
      ? h(Teleport, { to: 'body' }, h('div', {
        class: 'lb-ui-modal__backdrop',
        'data-laravel-blocks-modal-backdrop': '',
        onClick: (event) => {
          if (props.closeOnBackdrop && event.target === event.currentTarget) {
            close('backdrop');
          }
        },
      }, [h('section', {
        'aria-label': props.label,
        'aria-modal': 'true',
        class: 'lb-ui-modal',
        'data-laravel-blocks-modal': '',
        ref: panel,
        role: 'dialog',
        tabindex: '-1',
      }, slots.default?.())]))
      : null;
  },
};
