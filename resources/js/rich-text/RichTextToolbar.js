import { computed, h, nextTick, ref, watch } from 'vue';

import { IconButton, Toolbar, ToolbarGroup } from '../ui/index.js';
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
    const toolbar = ref(null);
    const style = ref({});
    const visible = computed(() => richTextToolbarVisible(props.selection));
    const items = computed(() => createRichTextToolbarItems(props.commandRegistry));

    function updatePosition() {
      if (!visible.value) {
        style.value = {};

        return;
      }

      const rect = toolbar.value?.getBoundingClientRect?.() ?? { height: 44, width: 112 };
      style.value = richTextToolbarStyle({
        editor: props.editor,
        placement: props.placement,
        selection: props.selection,
        toolbarRect: rect,
      });
    }

    function run(command) {
      const result = runRichTextToolbarCommand(props.commandRegistry, command);
      nextTick(updatePosition);

      return result;
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
        ],
      }),
    ]);
  },
};
