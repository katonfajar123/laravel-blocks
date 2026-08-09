import { computed, h, nextTick, ref, shallowRef, watch } from 'vue';

import { IconButton, Toolbar, ToolbarGroup } from '../ui/index.js';
import { LinkPopover } from './link-popover.js';
import {
  createRichTextToolbarItems,
  richTextToolbarStyle,
  richTextToolbarVisible,
  runRichTextToolbarCommand,
} from './toolbar.js';

export const RichTextToolbar = {
  name: 'LaravelBlocksRichTextToolbar',
  props: {
    commandRegistry: {
      type: Object,
      default: null,
    },
    editor: {
      type: Object,
      default: null,
    },
    placement: {
      type: String,
      default: 'top',
    },
    selection: {
      type: Object,
      default: null,
    },
  },
  setup(props, { expose }) {
    const linkPopoverOpen = ref(false);
    const linkSelection = shallowRef(null);
    const toolbar = ref(null);
    const style = ref({});
    const activeSelection = computed(() => (linkPopoverOpen.value ? linkSelection.value : props.selection));
    const visible = computed(() => linkPopoverOpen.value || richTextToolbarVisible(props.selection));
    const items = computed(() => createRichTextToolbarItems(props.commandRegistry));
    const linkState = computed(() => props.commandRegistry?.state?.('unsetLink', activeSelection.value
      ? { selection: activeSelection.value }
      : {}) ?? {
      active: false,
      disabledReason: 'Link is unavailable for the current selection.',
      enabled: false,
    });

    function updatePosition() {
      if (!visible.value) {
        style.value = {};

        return;
      }

      const rect = toolbar.value?.getBoundingClientRect?.() ?? { height: 44, width: 112 };
      style.value = richTextToolbarStyle({
        editor: props.editor,
        placement: props.placement,
        selection: activeSelection.value,
        toolbarRect: rect,
      });
    }

    function run(command) {
      const result = runRichTextToolbarCommand(props.commandRegistry, command);
      nextTick(updatePosition);

      return result;
    }

    function openLinkPopover() {
      if (!richTextToolbarVisible(props.selection)) {
        return;
      }

      linkSelection.value = props.selection;
      linkPopoverOpen.value = true;
      nextTick(updatePosition);
    }

    function closeLinkPopover() {
      linkPopoverOpen.value = false;
      nextTick(updatePosition);
    }

    watch(
      () => [props.selection?.from, props.selection?.to, props.selection?.empty, props.selection?.text],
      () => nextTick(updatePosition),
      { immediate: true },
    );

    expose({
      isVisible() {
        return visible.value;
      },
      items() {
        return items.value;
      },
      linkOpen() {
        return linkPopoverOpen.value;
      },
      run,
      updatePosition,
    });

    return () => h('div', {
      class: 'lb-ui-popover lb-rich-text-toolbar',
      'data-laravel-blocks-rich-text-toolbar': '',
      'data-laravel-blocks-state': visible.value ? 'open' : 'closed',
      hidden: !visible.value,
      ref: toolbar,
      style: style.value,
    }, [
      h(Toolbar, {
        label: 'Text formatting',
        'data-laravel-blocks-rich-text-toolbar-controls': '',
      }, {
        default: () => [
          h(ToolbarGroup, {
            label: 'Inline formatting',
          }, {
            default: () => items.value.map((item) => h(IconButton, {
              disabled: item.disabled,
              label: item.label,
              pressed: item.active,
              title: item.disabledReason || item.label,
              variant: item.active ? 'primary' : 'ghost',
              'data-laravel-blocks-rich-text-command': item.command,
              onClick: () => run(item.command),
              onMousedown: (event) => event.preventDefault(),
            }, {
              default: () => item.text,
            })),
          }),
          h(ToolbarGroup, {
            label: 'Link formatting',
          }, {
            default: () => h(IconButton, {
              disabled: !linkState.value.enabled && !richTextToolbarVisible(props.selection),
              label: 'Link',
              pressed: linkState.value.active,
              title: linkState.value.disabledReason || 'Link',
              variant: linkState.value.active ? 'primary' : 'ghost',
              'data-laravel-blocks-rich-text-command': 'openLink',
              onClick: openLinkPopover,
              onMousedown: (event) => event.preventDefault(),
            }, {
              default: () => 'Link',
            }),
          }),
        ],
      }),
      h(LinkPopover, {
        commandRegistry: props.commandRegistry,
        editor: props.editor,
        onClose: closeLinkPopover,
        open: linkPopoverOpen.value,
        selection: activeSelection.value,
      }),
    ]);
  },
};
