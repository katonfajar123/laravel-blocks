import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { createPopoverController } from './popover-controller.js';

export const Popover = {
  name: 'LaravelBlocksPopover',
  inheritAttrs: false,
  props: {
    defaultOpen: {
      type: Boolean,
      default: false,
    },
    id: {
      type: String,
      default: undefined,
    },
    labelledBy: {
      type: String,
      default: undefined,
    },
    offset: {
      type: Number,
      default: 8,
    },
    open: {
      type: Boolean,
      default: undefined,
    },
    placement: {
      type: String,
      default: 'bottom-start',
    },
    restoreFocus: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: 'dialog',
    },
  },
  emits: ['close', 'open', 'update:open'],
  setup(props, { attrs, emit, expose, slots }) {
    const element = ref(null);
    const anchor = ref(null);
    const internalOpen = ref(props.defaultOpen);
    let controller = null;

    const isControlled = computed(() => props.open !== undefined);
    const isOpen = computed(() => (isControlled.value ? props.open : internalOpen.value));

    function setOpen(value, reason = 'programmatic', event = null) {
      if (!isControlled.value) {
        internalOpen.value = value;
      }

      emit('update:open', value);
      emit(value ? 'open' : 'close', { reason, event });
    }

    function ensureController() {
      if (controller || !element.value) {
        return controller;
      }

      controller = createPopoverController({
        offset: props.offset,
        placement: props.placement,
        popover: element.value,
        restoreFocus: props.restoreFocus,
        onClose(reason, event) {
          if (isOpen.value) {
            setOpen(false, reason, event);
          }
        },
      });

      return controller;
    }

    function syncController() {
      nextTick(() => {
        const current = ensureController();

        if (!current) {
          return;
        }

        if (isOpen.value) {
          current.open(anchor.value);
        } else {
          current.close('state-sync');
        }
      });
    }

    function open(invokingElement = null) {
      anchor.value = invokingElement ?? anchor.value;
      setOpen(true);
      syncController();
    }

    function close(reason = 'programmatic') {
      setOpen(false, reason);
      syncController();
    }

    function toggle(invokingElement = null) {
      if (isOpen.value) {
        close('toggle');

        return;
      }

      open(invokingElement);
    }

    onMounted(syncController);
    onBeforeUnmount(() => controller?.destroy());
    watch(() => [props.open, props.placement, props.offset], syncController);

    expose({
      close,
      isOpen() {
        return isOpen.value;
      },
      open,
      toggle,
      updatePosition() {
        return ensureController()?.updatePosition() ?? null;
      },
    });

    return () => h('div', {
      ...attrs,
      'aria-labelledby': props.labelledBy,
      class: [
        'lb-ui-popover',
        attrs.class,
      ].filter(Boolean),
      'data-laravel-blocks-popover': '',
      hidden: !isOpen.value,
      id: props.id,
      ref: element,
      role: props.role,
      tabindex: '-1',
    }, slots.default?.());
  },
};
