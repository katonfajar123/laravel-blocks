import { h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import { LinkPopover } from '../rich-text/index.js';
import {
  Icon,
  IconButton,
  Toolbar,
  ToolbarGroup,
  blockIconName,
  targetIsInside,
} from '../ui/index.js';
import { blockFrameStyle, blockToolbarStyle } from './block-selection.js';

const transformItems = Object.freeze([
  Object.freeze({
    command: 'setParagraph',
    icon: 'paragraph',
    label: 'Paragraph',
  }),
  Object.freeze({
    command: 'setHeading',
    icon: 'heading',
    label: 'Heading',
    payload: { level: 2 },
  }),
  Object.freeze({
    command: 'toggleBulletList',
    icon: 'list',
    label: 'List',
  }),
  Object.freeze({
    command: 'setBlockquote',
    icon: 'quote',
    label: 'Quote',
  }),
  Object.freeze({
    command: 'setCodeBlock',
    icon: 'code',
    label: 'Code',
  }),
]);

const optionCommands = [
  ['duplicateBlock', 'Duplicate'],
  ['insertBlockBefore', 'Insert before'],
  ['insertBlockAfter', 'Insert after'],
  ['deleteBlock', 'Delete'],
];

function commandState(registry, command, payload = {}) {
  return registry?.state?.(command, payload) ?? {
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
    selection: {
      type: Object,
      default: null,
    },
    suppressed: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { expose }) {
    const externalOverlayOpen = ref(false);
    const frameStyle = ref({});
    const linkPopoverOpen = ref(false);
    const linkSelection = shallowRef(null);
    const moreOpen = ref(false);
    const root = ref(null);
    const toolbar = ref(null);
    const toolbarStyle = ref({});
    const transformOpen = ref(false);

    function closeMenus() {
      moreOpen.value = false;
      transformOpen.value = false;
    }

    function hidden() {
      return !props.block.active || props.suppressed || externalOverlayOpen.value;
    }

    function handleOverlayOpen(event) {
      if (event.detail?.source && event.detail.source !== 'contextual-toolbar') {
        externalOverlayOpen.value = true;
        closeMenus();
        linkPopoverOpen.value = false;
      }
    }

    function handleOverlayClose(event) {
      if (event.detail?.source && event.detail.source !== 'contextual-toolbar') {
        externalOverlayOpen.value = false;
        nextTick(updatePosition);
      }
    }

    function handleOutsidePointer(event) {
      if (targetIsInside(event.target, [root.value])) {
        return;
      }

      closeMenus();
      linkPopoverOpen.value = false;
    }

    function updatePosition() {
      if (hidden()) {
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
        toolbarRect: toolbar.value?.getBoundingClientRect?.() ?? { height: 48, width: 560 },
      });
    }

    function run(command, payload = {}) {
      const result = props.commandRegistry?.run?.(command, {
        block: props.block,
        ...payload,
      }) ?? { executed: false };

      if (result.executed) {
        closeMenus();
      }

      nextTick(updatePosition);

      return result;
    }

    function option(command, label) {
      const state = commandState(props.commandRegistry, command, { block: props.block });

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

    function transformOption(item) {
      const state = commandState(props.commandRegistry, item.command, {
        block: props.block,
        ...(item.payload ?? {}),
      });

      return h('button', {
        class: [
          'lb-block-toolbar__transform-item',
          state.active ? 'lb-block-toolbar__transform-item--active' : null,
        ].filter(Boolean),
        disabled: !state.enabled,
        'data-laravel-blocks-block-transform-item': item.command,
        onClick: () => run(item.command, item.payload ?? {}),
        onMousedown: (event) => event.preventDefault(),
        role: 'menuitemradio',
        title: state.disabledReason || item.label,
        type: 'button',
      }, [
        h(Icon, {
          name: item.icon,
          size: 18,
        }),
        h('span', item.label),
      ]);
    }

    function iconCommand(command, icon, label, payload = {}) {
      const state = commandState(props.commandRegistry, command, {
        block: props.block,
        ...payload,
      });

      return h(IconButton, {
        disabled: !state.enabled,
        label,
        pressed: state.active,
        size: 'sm',
        title: state.disabledReason || label,
        variant: state.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-command': command,
        'data-laravel-blocks-contextual-command': command,
        onClick: () => run(command, payload),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => h(Icon, { name: icon }),
      });
    }

    function openLinkPopover() {
      if (!props.selection || props.selection.empty) {
        return;
      }

      linkSelection.value = props.selection;
      linkPopoverOpen.value = true;
      closeMenus();
      nextTick(updatePosition);
    }

    function boldButton() {
      const state = commandState(props.commandRegistry, 'toggleBold');

      return h(IconButton, {
        disabled: !state.enabled,
        label: 'Bold',
        pressed: state.active,
        size: 'sm',
        title: state.disabledReason || 'Bold',
        variant: state.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-command': 'toggleBold',
        'data-laravel-blocks-contextual-command': 'toggleBold',
        onClick: () => run('toggleBold'),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => h('span', {
          class: 'lb-contextual-toolbar__bold',
        }, 'B'),
      });
    }

    function closeLinkPopover() {
      linkPopoverOpen.value = false;
      nextTick(updatePosition);
    }

    onMounted(() => {
      globalThis.document?.addEventListener?.('pointerdown', handleOutsidePointer, true);
      globalThis.document?.addEventListener?.('laravel-blocks:overlay-open', handleOverlayOpen);
      globalThis.document?.addEventListener?.('laravel-blocks:overlay-close', handleOverlayClose);
    });

    onBeforeUnmount(() => {
      globalThis.document?.removeEventListener?.('pointerdown', handleOutsidePointer, true);
      globalThis.document?.removeEventListener?.('laravel-blocks:overlay-open', handleOverlayOpen);
      globalThis.document?.removeEventListener?.('laravel-blocks:overlay-close', handleOverlayClose);
    });

    watch(
      () => [
        props.block.active,
        props.block.from,
        props.block.to,
        props.block.type,
        props.block.index,
        props.block.siblingCount,
        props.selection?.from,
        props.selection?.to,
        props.selection?.empty,
        props.suppressed,
        externalOverlayOpen.value,
      ],
      () => {
        closeMenus();

        if (hidden()) {
          linkPopoverOpen.value = false;
        }

        nextTick(updatePosition);
      },
      { immediate: true },
    );

    expose({
      isVisible() {
        return !hidden();
      },
      run,
      updatePosition,
    });

    return () => h('div', {
      'data-laravel-blocks-block-controls': '',
      hidden: hidden(),
      ref: root,
    }, [
      h('div', {
        'aria-hidden': 'true',
        class: 'lb-block-selection-frame',
        'data-laravel-blocks-block-wrapper': '',
        'data-laravel-blocks-block-type': props.block.type,
        hidden: hidden(),
        style: frameStyle.value,
      }),
      h('div', {
        class: 'lb-ui-popover lb-block-toolbar lb-contextual-toolbar',
        'data-laravel-blocks-block-toolbar': '',
        'data-laravel-blocks-contextual-toolbar': '',
        hidden: hidden(),
        ref: toolbar,
        style: toolbarStyle.value,
      }, [
        h(Toolbar, {
          label: 'Contextual editor controls',
        }, {
          default: () => [
            h(ToolbarGroup, {
              label: 'Transform block',
            }, {
              default: () => [
                h('button', {
                  'aria-expanded': transformOpen.value ? 'true' : 'false',
                  'aria-haspopup': 'menu',
                  class: 'lb-block-toolbar__transform',
                  'data-laravel-blocks-block-transform': '',
                  onClick: () => {
                    transformOpen.value = !transformOpen.value;
                    moreOpen.value = false;
                    linkPopoverOpen.value = false;
                    nextTick(updatePosition);
                  },
                  onMousedown: (event) => event.preventDefault(),
                  title: 'Transform block',
                  type: 'button',
                }, [
                  h(Icon, {
                    name: blockIconName(props.block.type),
                    size: 18,
                  }),
                  h('span', {
                    'data-laravel-blocks-block-label': '',
                  }, props.block.label),
                ]),
                h('div', {
                  class: 'lb-block-toolbar__transform-menu',
                  'data-laravel-blocks-block-transform-menu': '',
                  hidden: !transformOpen.value,
                  role: 'menu',
                }, [
                  h('span', {
                    class: 'lb-block-toolbar__menu-eyebrow',
                  }, 'Transform to'),
                  ...transformItems.map(transformOption),
                ]),
              ],
            }),
            h(ToolbarGroup, {
              label: 'Move block',
            }, {
              default: () => [
                h(Icon, {
                  name: 'dragHandle',
                  size: 18,
                }),
                iconCommand('moveBlockUp', 'arrowUp', 'Move block up'),
                iconCommand('moveBlockDown', 'arrowDown', 'Move block down'),
              ],
            }),
            h(ToolbarGroup, {
              label: 'Inline formatting',
            }, {
              default: () => [
                h(IconButton, {
                  disabled: true,
                  label: 'AI assistant',
                  size: 'sm',
                  title: 'AI assistant is not implemented yet.',
                  variant: 'ghost',
                }, {
                  default: () => h(Icon, { name: 'sparkle' }),
                }),
                boldButton(),
                h(IconButton, {
                  disabled: !commandState(props.commandRegistry, 'toggleItalic').enabled,
                  label: 'Italic',
                  pressed: commandState(props.commandRegistry, 'toggleItalic').active,
                  size: 'sm',
                  title: commandState(props.commandRegistry, 'toggleItalic').disabledReason || 'Italic',
                  variant: commandState(props.commandRegistry, 'toggleItalic').active ? 'primary' : 'ghost',
                  'data-laravel-blocks-block-command': 'toggleItalic',
                  'data-laravel-blocks-contextual-command': 'toggleItalic',
                  onClick: () => run('toggleItalic'),
                  onMousedown: (event) => event.preventDefault(),
                }, {
                  default: () => h('span', {
                    class: 'lb-contextual-toolbar__italic',
                  }, 'I'),
                }),
                h(IconButton, {
                  disabled: !props.selection || props.selection.empty,
                  label: 'Link',
                  pressed: commandState(props.commandRegistry, 'unsetLink').active,
                  size: 'sm',
                  title: props.selection?.empty ? 'Select text before adding a link.' : 'Link',
                  variant: commandState(props.commandRegistry, 'unsetLink').active ? 'primary' : 'ghost',
                  'data-laravel-blocks-block-command': 'openLink',
                  'data-laravel-blocks-contextual-command': 'openLink',
                  onClick: openLinkPopover,
                  onMousedown: (event) => event.preventDefault(),
                }, {
                  default: () => h(Icon, { name: 'link' }),
                }),
              ],
            }),
            h(ToolbarGroup, {
              label: 'More block options',
            }, {
              default: () => [
                h(IconButton, {
                  label: 'More options',
                  pressed: moreOpen.value,
                  size: 'sm',
                  'data-laravel-blocks-block-options': '',
                  onClick: () => {
                    moreOpen.value = !moreOpen.value;
                    transformOpen.value = false;
                    linkPopoverOpen.value = false;
                    nextTick(updatePosition);
                  },
                  onMousedown: (event) => event.preventDefault(),
                }, {
                  default: () => h(Icon, { name: 'moreVertical' }),
                }),
                h('div', {
                  class: 'lb-block-toolbar__menu',
                  'data-laravel-blocks-block-options-menu': '',
                  hidden: !moreOpen.value,
                  role: 'menu',
                }, optionCommands.map(([command, label]) => option(command, label))),
              ],
            }),
          ],
        }),
        h(LinkPopover, {
          commandRegistry: props.commandRegistry,
          editor: props.editor,
          onClose: closeLinkPopover,
          open: linkPopoverOpen.value,
          selection: linkSelection.value,
        }),
      ]),
    ]);
  },
};
