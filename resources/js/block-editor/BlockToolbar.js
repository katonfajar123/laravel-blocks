import { h, nextTick, ref, watch } from 'vue';

import { IconButton, Toolbar, ToolbarGroup } from '../ui/index.js';
import { blockFrameStyle, blockToolbarStyle } from './block-selection.js';

const optionCommands = [
  ['duplicateBlock', 'Duplicate'],
  ['insertBlockBefore', 'Insert before'],
  ['insertBlockAfter', 'Insert after'],
  ['deleteBlock', 'Delete'],
];

function commandState(registry, command, block) {
  return registry?.state?.(command, { block }) ?? {
    active: false,
    disabledReason: `${command} is unavailable.`,
    enabled: false,
  };
}

export const BlockToolbar = {
  name: 'LaravelBlocksBlockToolbar',
  props: {
    block: {
      type: Object,
      required: true,
    },
    commandRegistry: {
      type: Object,
      default: null,
    },
    editor: {
      type: Object,
      default: null,
    },
  },
  setup(props, { expose }) {
    const frameStyle = ref({});
    const menuOpen = ref(false);
    const toolbar = ref(null);
    const toolbarStyle = ref({});

    function updatePosition() {
      if (!props.block.active) {
        frameStyle.value = {};
        toolbarStyle.value = {};

        return;
      }

      frameStyle.value = blockFrameStyle({
        block: props.block,
        editor: props.editor,
      });
      toolbarStyle.value = blockToolbarStyle({
        block: props.block,
        editor: props.editor,
        toolbarRect: toolbar.value?.getBoundingClientRect?.() ?? { height: 40, width: 300 },
      });
    }

    function run(command) {
      const result = props.commandRegistry?.run?.(command, { block: props.block }) ?? { executed: false };

      menuOpen.value = false;
      nextTick(updatePosition);

      return result;
    }

    function option(command, label) {
      const state = commandState(props.commandRegistry, command, props.block);

      return h('button', {
        class: [
          'lb-block-toolbar__menu-item',
          command === 'deleteBlock' ? 'lb-block-toolbar__menu-item--danger' : null,
        ].filter(Boolean),
        disabled: !state.enabled,
        'data-laravel-blocks-block-menu-command': command,
        onClick: () => run(command),
        onMousedown: (event) => event.preventDefault(),
        role: 'menuitem',
        title: state.disabledReason || label,
        type: 'button',
      }, label);
    }

    function mover(command, text, label) {
      const state = commandState(props.commandRegistry, command, props.block);

      return h(IconButton, {
        disabled: !state.enabled,
        label,
        size: 'sm',
        title: state.disabledReason || label,
        'data-laravel-blocks-block-command': command,
        onClick: () => run(command),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => text,
      });
    }

    watch(
      () => [
        props.block.active,
        props.block.from,
        props.block.to,
        props.block.type,
        props.block.index,
        props.block.siblingCount,
      ],
      () => {
        menuOpen.value = false;
        nextTick(updatePosition);
      },
      { immediate: true },
    );

    expose({
      isVisible() {
        return props.block.active;
      },
      run,
      updatePosition,
    });

    return () => h('div', {
      'data-laravel-blocks-block-controls': '',
      hidden: !props.block.active,
    }, [
      h('div', {
        'aria-hidden': 'true',
        class: 'lb-block-selection-frame',
        'data-laravel-blocks-block-wrapper': '',
        'data-laravel-blocks-block-type': props.block.type,
        hidden: !props.block.active,
        style: frameStyle.value,
      }),
      h('div', {
        class: 'lb-ui-popover lb-block-toolbar',
        'data-laravel-blocks-block-toolbar': '',
        hidden: !props.block.active,
        ref: toolbar,
        style: toolbarStyle.value,
      }, [
        h(Toolbar, {
          label: 'Block controls',
        }, {
          default: () => [
            h(ToolbarGroup, {
              label: 'Current block',
            }, {
              default: () => h('span', {
                class: 'lb-block-toolbar__type',
                'data-laravel-blocks-block-label': '',
              }, props.block.label),
            }),
            h(ToolbarGroup, {
              label: 'Move block',
            }, {
              default: () => [
                mover('moveBlockUp', '↑', 'Move block up'),
                mover('moveBlockDown', '↓', 'Move block down'),
              ],
            }),
            h(ToolbarGroup, {
              label: 'Block options',
            }, {
              default: () => [
                h(IconButton, {
                  label: 'Block options',
                  pressed: menuOpen.value,
                  size: 'sm',
                  'data-laravel-blocks-block-options': '',
                  onClick: () => {
                    menuOpen.value = !menuOpen.value;
                    nextTick(updatePosition);
                  },
                  onMousedown: (event) => event.preventDefault(),
                }, {
                  default: () => '•••',
                }),
                h('div', {
                  class: 'lb-block-toolbar__menu',
                  'data-laravel-blocks-block-options-menu': '',
                  hidden: !menuOpen.value,
                  role: 'menu',
                }, optionCommands.map(([command, label]) => option(command, label))),
              ],
            }),
          ],
        }),
      ]),
    ]);
  },
};
