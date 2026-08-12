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
import {
  createBlockDragState,
  createEmptyBlockDragState,
  dropIndicatorStyle,
  topLevelDropTarget,
} from './block-drag.js';
import { blockFrameStyle, blockRect, blockToolbarStyle } from './block-selection.js';

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

const hoverOptionCommands = [
  ['duplicateBlock', 'Duplicate'],
  ['insertBlockBefore', 'Insert before'],
  ['insertBlockAfter', 'Insert after'],
  ['moveBlockUp', 'Move up'],
  ['moveBlockDown', 'Move down'],
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
    mode: {
      type: String,
      default: 'block',
      validator: (value) => ['block', 'empty', 'hover', 'inline'].includes(value),
    },
    suppressed: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['hoverControlsEnter', 'hoverControlsLeave'],
  setup(props, { emit, expose }) {
    const externalOverlayOpen = ref(false);
    const frameStyle = ref({});
    const drag = shallowRef(createEmptyBlockDragState());
    const dragBlock = shallowRef(null);
    const dragHandle = ref(null);
    const linkPopoverOpen = ref(false);
    const linkSelection = shallowRef(null);
    const menuPlacement = ref('bottom');
    const moreOpen = ref(false);
    const root = ref(null);
    const toolbar = ref(null);
    const toolbarStyle = ref({});
    const transformOpen = ref(false);
    let activePointerId = null;

    function closeMenus() {
      moreOpen.value = false;
      transformOpen.value = false;
    }

    function hidden() {
      return !props.block.active || props.suppressed || externalOverlayOpen.value;
    }

    function frameHidden() {
      return hidden() || props.mode !== 'block';
    }

    function canDragBlock() {
      return props.block.active && props.block.depth === 1 && props.block.siblingCount > 1 && !props.suppressed;
    }

    function currentToolbarRect(fallbackWidth = 560) {
      return toolbar.value?.getBoundingClientRect?.() ?? { height: 48, width: fallbackWidth };
    }

    function clampToolbarToViewport({ left, rect, top, viewportPadding = 8 }) {
      const viewportWidth = globalThis.window?.innerWidth ?? 1024;
      const viewportHeight = globalThis.window?.innerHeight ?? 768;
      const toolbarWidth = rect.width ?? 240;
      const toolbarHeight = rect.height ?? 40;
      const stickyHeader = globalThis.document?.querySelector?.('[data-laravel-blocks-editor-header]');
      const stickyHeaderBottom = stickyHeader?.getBoundingClientRect?.().bottom ?? 0;
      const minimumTop = Math.max(viewportPadding, stickyHeaderBottom + viewportPadding);

      return Object.freeze({
        left: `${Math.round(Math.min(
          Math.max(viewportPadding, left),
          viewportWidth - toolbarWidth - viewportPadding,
        ))}px`,
        position: 'fixed',
        top: `${Math.round(Math.min(
          Math.max(minimumTop, top),
          viewportHeight - toolbarHeight - viewportPadding,
        ))}px`,
      });
    }

    function inlineSelectionRect() {
      if (!props.editor?.view?.coordsAtPos || !props.selection || props.selection.empty) {
        return null;
      }

      try {
        const from = props.editor.view.coordsAtPos(props.selection.from);
        const to = props.editor.view.coordsAtPos(props.selection.to);

        return Object.freeze({
          bottom: Math.max(from.bottom, to.bottom),
          height: Math.max(1, Math.max(from.bottom, to.bottom) - Math.min(from.top, to.top)),
          left: Math.min(from.left, to.left),
          right: Math.max(from.right, to.right),
          top: Math.min(from.top, to.top),
          width: Math.max(1, Math.max(from.right, to.right) - Math.min(from.left, to.left)),
        });
      } catch {
        return null;
      }
    }

    function inlineToolbarStyle() {
      const rect = inlineSelectionRect() ?? blockRect(props.editor, props.block);

      if (!rect) {
        return Object.freeze({});
      }

      const toolbarRect = currentToolbarRect(220);

      return clampToolbarToViewport({
        left: rect.left + ((rect.width - (toolbarRect.width ?? 220)) / 2),
        rect: toolbarRect,
        top: rect.top - (toolbarRect.height ?? 40) - 8,
      });
    }

    function hoverToolbarStyle() {
      const rect = blockRect(props.editor, props.block);

      if (!rect) {
        return Object.freeze({});
      }

      const toolbarRect = currentToolbarRect(112);
      const left = rect.left - (toolbarRect.width ?? 112) - 8;

      return clampToolbarToViewport({
        left,
        rect: toolbarRect,
        top: rect.top + Math.max(0, (rect.height - (toolbarRect.height ?? 40)) / 2),
      });
    }

    function updateMenuPlacement() {
      if (props.mode !== 'hover') {
        menuPlacement.value = 'bottom';

        return;
      }

      const toolbarRect = toolbar.value?.getBoundingClientRect?.();
      const viewportHeight = globalThis.window?.innerHeight ?? 768;
      const stickyHeader = globalThis.document?.querySelector?.('[data-laravel-blocks-editor-header]');
      const stickyHeaderBottom = stickyHeader?.getBoundingClientRect?.().bottom ?? 0;
      const top = toolbarRect?.top ?? Number.parseFloat(toolbarStyle.value.top ?? '0') ?? 0;
      const bottom = toolbarRect?.bottom ?? top + 48;
      const menuHeight = 320;
      const spaceAbove = top - stickyHeaderBottom - 8;
      const spaceBelow = viewportHeight - bottom - 8;

      menuPlacement.value = spaceBelow < menuHeight && spaceAbove > spaceBelow
        ? 'top'
        : 'bottom';
    }

    function pointerTarget(event) {
      return globalThis.document?.elementFromPoint?.(event.clientX, event.clientY) ?? event.target;
    }

    function removeDragListeners() {
      globalThis.document?.removeEventListener?.('pointermove', handleDocumentPointerMove, true);
      globalThis.document?.removeEventListener?.('pointerup', handleDocumentPointerUp, true);
      globalThis.document?.removeEventListener?.('pointercancel', handleDocumentPointerCancel, true);
      globalThis.document?.body?.classList?.remove?.('lb-is-dragging-block');
    }

    function clearDrag() {
      if (activePointerId !== null) {
        try {
          dragHandle.value?.releasePointerCapture?.(activePointerId);
        } catch {
          // Pointer capture can already be released by the browser.
        }
      }

      activePointerId = null;
      drag.value = createEmptyBlockDragState();
      dragBlock.value = null;
      removeDragListeners();
      nextTick(updatePosition);
    }

    function updateDropTarget(event) {
      const state = topLevelDropTarget({
        block: dragBlock.value,
        clientY: event.clientY,
        editor: props.editor,
        eventTarget: pointerTarget(event),
      });

      drag.value = state;

      return state;
    }

    function beginDrag(event) {
      if (event.button !== 0 || !canDragBlock()) {
        return;
      }

      event.preventDefault();
      closeMenus();
      linkPopoverOpen.value = false;
      dragBlock.value = props.block;
      drag.value = createBlockDragState(props.block);
      activePointerId = event.pointerId;
      event.currentTarget?.setPointerCapture?.(event.pointerId);
      globalThis.document?.addEventListener?.('pointermove', handleDocumentPointerMove, true);
      globalThis.document?.addEventListener?.('pointerup', handleDocumentPointerUp, true);
      globalThis.document?.addEventListener?.('pointercancel', handleDocumentPointerCancel, true);
      globalThis.document?.body?.classList?.add?.('lb-is-dragging-block');
      nextTick(updatePosition);
    }

    function handleDocumentPointerMove(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      updateDropTarget(event);
    }

    function handleDocumentPointerUp(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const state = updateDropTarget(event);

      if (state.valid) {
        run('moveBlockToIndex', {
          block: dragBlock.value,
          toIndex: state.targetIndex,
        });
      }

      clearDrag();
    }

    function handleDocumentPointerCancel(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      clearDrag();
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

      frameStyle.value = frameHidden()
        ? {}
        : blockFrameStyle({
          block: props.block,
          editor: props.editor,
        });

      if (props.mode === 'inline') {
        toolbarStyle.value = inlineToolbarStyle();
        nextTick(updateMenuPlacement);

        return;
      }

      if (props.mode === 'hover' || props.mode === 'empty') {
        toolbarStyle.value = hoverToolbarStyle();
        nextTick(updateMenuPlacement);

        return;
      }

      toolbarStyle.value = blockToolbarStyle({
        block: props.block,
        editor: props.editor,
        toolbarRect: currentToolbarRect(560),
      });
      nextTick(updateMenuPlacement);
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

    function transformMenu() {
      return h('div', {
        class: 'lb-block-toolbar__transform-menu',
        'data-laravel-blocks-block-transform-menu': '',
        hidden: !transformOpen.value,
        role: 'menu',
      }, [
        h('span', {
          class: 'lb-block-toolbar__menu-eyebrow',
        }, 'Transform to'),
        ...transformItems.map(transformOption),
      ]);
    }

    function transformGroup({ empty = false } = {}) {
      return h(ToolbarGroup, {
        label: empty ? 'Empty block affordance' : 'Transform block',
      }, {
        default: () => [
          h('button', {
            'aria-expanded': transformOpen.value ? 'true' : 'false',
            'aria-haspopup': 'menu',
            class: [
              'lb-block-toolbar__transform',
              empty ? 'lb-block-toolbar__transform--empty' : null,
            ].filter(Boolean),
            'data-laravel-blocks-block-transform': '',
            'data-laravel-blocks-empty-block-affordance': empty ? '' : null,
            onClick: () => {
              transformOpen.value = !transformOpen.value;
              moreOpen.value = false;
              linkPopoverOpen.value = false;
              nextTick(updatePosition);
            },
            onMousedown: (event) => event.preventDefault(),
            title: empty ? 'Add or transform empty block' : 'Transform block',
            type: 'button',
          }, [
            h(Icon, {
              name: empty ? 'plus' : blockIconName(props.block.type),
              size: 18,
            }),
            empty
              ? null
              : h('span', {
                'data-laravel-blocks-block-label': '',
              }, props.block.label),
          ]),
          transformMenu(),
        ],
      });
    }

    function dragHandleButton() {
      return h(IconButton, {
        class: 'lb-block-toolbar__drag-handle',
        disabled: !canDragBlock(),
        label: 'Drag block',
        pressed: drag.value.active,
        size: 'sm',
        title: canDragBlock() ? 'Drag block' : 'Drag block needs another top-level block.',
        variant: drag.value.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-drag-handle': '',
        onMousedown: (event) => event.preventDefault(),
        onPointerdown: beginDrag,
        ref: dragHandle,
      }, {
        default: () => h(Icon, {
          name: 'dragHandle',
          size: 18,
        }),
      });
    }

    function moveGroup({ compact = false } = {}) {
      return h(ToolbarGroup, {
        label: compact ? 'Block handle' : 'Move block',
      }, {
        default: () => compact
          ? [dragHandleButton()]
          : [
            dragHandleButton(),
            iconCommand('moveBlockUp', 'arrowUp', 'Move block up'),
            iconCommand('moveBlockDown', 'arrowDown', 'Move block down'),
          ],
      });
    }

    function italicButton() {
      const state = commandState(props.commandRegistry, 'toggleItalic');

      return h(IconButton, {
        disabled: !state.enabled,
        label: 'Italic',
        pressed: state.active,
        size: 'sm',
        title: state.disabledReason || 'Italic',
        variant: state.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-command': 'toggleItalic',
        'data-laravel-blocks-contextual-command': 'toggleItalic',
        onClick: () => run('toggleItalic'),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => h('span', {
          class: 'lb-contextual-toolbar__italic',
        }, 'I'),
      });
    }

    function linkButton() {
      const state = commandState(props.commandRegistry, 'unsetLink');

      return h(IconButton, {
        disabled: !props.selection || props.selection.empty,
        label: 'Link',
        pressed: state.active,
        size: 'sm',
        title: props.selection?.empty ? 'Select text before adding a link.' : 'Link',
        variant: state.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-command': 'openLink',
        'data-laravel-blocks-contextual-command': 'openLink',
        onClick: openLinkPopover,
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => h(Icon, { name: 'link' }),
      });
    }

    function inlineGroup({ includeAssistant = false } = {}) {
      return h(ToolbarGroup, {
        label: 'Inline formatting',
      }, {
        default: () => [
          includeAssistant
            ? h(IconButton, {
              disabled: true,
              label: 'AI assistant',
              size: 'sm',
              title: 'AI assistant is not implemented yet.',
              variant: 'ghost',
            }, {
              default: () => h(Icon, { name: 'sparkle' }),
            })
            : null,
          boldButton(),
          italicButton(),
          linkButton(),
        ].filter(Boolean),
      });
    }

    function moreGroup({ includeTransform = false, commands = optionCommands } = {}) {
      return h(ToolbarGroup, {
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
            'data-laravel-blocks-block-options-menu-placement': menuPlacement.value,
            hidden: !moreOpen.value,
            role: 'menu',
          }, [
            includeTransform
              ? [
                h('span', {
                  class: 'lb-block-toolbar__menu-eyebrow',
                }, 'Transform to'),
                ...transformItems.map(transformOption),
              ]
              : null,
            ...commands.map(([command, label]) => option(command, label)),
          ].flat().filter(Boolean)),
        ],
      });
    }

    function toolbarGroups() {
      if (props.mode === 'inline') {
        return [inlineGroup()];
      }

      if (props.mode === 'hover') {
        return [
          moveGroup({ compact: true }),
          moreGroup({ includeTransform: true, commands: hoverOptionCommands }),
        ];
      }

      if (props.mode === 'empty') {
        return [transformGroup({ empty: true })];
      }

      return [
        transformGroup(),
        moveGroup(),
        inlineGroup({ includeAssistant: true }),
        moreGroup(),
      ];
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
      removeDragListeners();
    });

    watch(
      () => [
        props.block.active,
        props.block.from,
        props.block.to,
        props.block.type,
        props.block.index,
        props.block.siblingCount,
        props.mode,
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
      'data-laravel-blocks-block-controls-mode': props.mode,
      hidden: hidden(),
      onPointerenter: () => emit('hoverControlsEnter'),
      onPointerleave: () => emit('hoverControlsLeave'),
      ref: root,
    }, [
      h('div', {
        'aria-hidden': 'true',
        class: 'lb-block-selection-frame',
        'data-laravel-blocks-block-wrapper': '',
        'data-laravel-blocks-block-type': props.block.type,
        hidden: frameHidden(),
        style: frameStyle.value,
      }),
      h('div', {
        class: [
          'lb-ui-popover',
          'lb-block-toolbar',
          'lb-contextual-toolbar',
          `lb-block-toolbar--${props.mode}`,
        ],
        'data-laravel-blocks-block-toolbar': '',
        'data-laravel-blocks-contextual-toolbar': '',
        'data-laravel-blocks-contextual-toolbar-mode': props.mode,
        hidden: hidden(),
        ref: toolbar,
        style: toolbarStyle.value,
      }, [
        h(Toolbar, {
          label: 'Contextual editor controls',
        }, {
          default: toolbarGroups,
        }),
        h(LinkPopover, {
          commandRegistry: props.commandRegistry,
          editor: props.editor,
          onClose: closeLinkPopover,
          open: linkPopoverOpen.value,
          selection: linkSelection.value,
        }),
      ]),
      h('div', {
        class: [
          'lb-block-drop-indicator',
          drag.value.valid ? 'lb-block-drop-indicator--valid' : 'lb-block-drop-indicator--invalid',
        ],
        'data-laravel-blocks-block-drop-index': drag.value.targetIndex,
        'data-laravel-blocks-block-drop-indicator': '',
        'data-laravel-blocks-block-drop-state': drag.value.valid ? 'valid' : 'invalid',
        hidden: !drag.value.active,
        style: dropIndicatorStyle(drag.value, blockRect(props.editor, dragBlock.value ?? props.block)),
      }, [
        h('span', {
          class: 'lb-block-drop-indicator__label',
        }, drag.value.valid ? 'Drop here' : drag.value.reason),
      ]),
    ]);
  },
};
