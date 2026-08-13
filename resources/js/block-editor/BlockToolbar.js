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
import { blockRect, blockToolbarStyle } from './block-selection.js';

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

const headingLevels = Object.freeze([1, 2, 3, 4, 5, 6]);
const inlineBlockTypes = new Set([
  'blockquote',
  'bulletList',
  'heading',
  'listItem',
  'orderedList',
  'paragraph',
]);

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
      validator: (value) => ['block', 'handle', 'inline'].includes(value),
    },
    suppressed: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['hoverControlsEnter', 'hoverControlsLeave', 'requestBlockControls'],
  setup(props, { emit, expose }) {
    const externalOverlayOpen = ref(false);
    const drag = shallowRef(createEmptyBlockDragState());
    const dragBlock = shallowRef(null);
    const dragHandle = ref(null);
    const headingLevelOpen = ref(false);
    const handleStyle = ref({});
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
      headingLevelOpen.value = false;
      moreOpen.value = false;
      transformOpen.value = false;
    }

    function hidden() {
      return !props.block.active || props.suppressed || externalOverlayOpen.value;
    }

    function toolbarHidden() {
      return hidden() || props.mode === 'handle';
    }

    function canDragBlock() {
      return props.block.active && props.block.depth === 1 && props.block.siblingCount > 1 && !props.suppressed;
    }

    function currentToolbarRect(fallbackWidth = 560) {
      return toolbar.value?.getBoundingClientRect?.() ?? { height: 48, width: fallbackWidth };
    }

    function inlineSelectionRect() {
      if (!props.editor?.view?.coordsAtPos || !props.selection || props.selection.empty) {
        return null;
      }

      try {
        const from = props.editor.view.coordsAtPos(props.selection.from);
        const to = props.editor.view.coordsAtPos(props.selection.to);

        return Object.freeze({
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
      const rect = inlineSelectionRect();

      if (!rect) {
        return null;
      }

      const viewportPadding = 8;
      const toolbarRect = currentToolbarRect(620);
      const viewportWidth = globalThis.window?.innerWidth ?? 1024;
      const stickyHeader = globalThis.document?.querySelector?.('[data-laravel-blocks-editor-header]');
      const minimumTop = Math.max(
        viewportPadding,
        (stickyHeader?.getBoundingClientRect?.().bottom ?? 0) + viewportPadding,
      );

      return Object.freeze({
        left: `${Math.round(Math.min(
          Math.max(
            viewportPadding,
            rect.left + ((rect.width - (toolbarRect.width ?? 620)) / 2),
          ),
          viewportWidth - (toolbarRect.width ?? 620) - viewportPadding,
        ))}px`,
        position: 'fixed',
        top: `${Math.round(Math.max(
          minimumTop,
          rect.top - (toolbarRect.height ?? 48) - 16,
        ))}px`,
      });
    }

    function blockHandleStyle() {
      const rect = blockRect(props.editor, props.block);

      if (!rect) {
        return Object.freeze({});
      }

      const viewportPadding = 8;
      const size = 40;
      const viewportHeight = globalThis.window?.innerHeight ?? 768;

      return Object.freeze({
        left: `${Math.round(Math.max(viewportPadding, rect.left - size - 8))}px`,
        position: 'fixed',
        top: `${Math.round(Math.min(
          Math.max(viewportPadding, rect.top + ((rect.height - size) / 2)),
          viewportHeight - size - viewportPadding,
        ))}px`,
      });
    }

    function updateMenuPlacement() {
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
        handleStyle.value = {};
        toolbarStyle.value = {};

        return;
      }

      if (props.mode === 'handle') {
        handleStyle.value = blockHandleStyle();
        toolbarStyle.value = {};

        return;
      }

      handleStyle.value = {};

      if (props.mode === 'inline') {
        toolbarStyle.value = inlineToolbarStyle() ?? blockToolbarStyle({
          block: props.block,
          editor: props.editor,
          offset: 40,
          toolbarRect: currentToolbarRect(620),
        });
        nextTick(updateMenuPlacement);

        return;
      }

      toolbarStyle.value = blockToolbarStyle({
        block: props.block,
        editor: props.editor,
        offset: 40,
        toolbarRect: currentToolbarRect(620),
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

    function transformGroup() {
      return h(ToolbarGroup, {
        class: 'lb-block-toolbar__transform-group',
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
              headingLevelOpen.value = false;
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
          transformMenu(),
        ],
      });
    }

    function headingLevelOption(level) {
      const state = commandState(props.commandRegistry, 'setHeading', {
        block: props.block,
        level,
      });

      return h('button', {
        class: [
          'lb-block-toolbar__transform-item',
          state.active ? 'lb-block-toolbar__transform-item--active' : null,
        ].filter(Boolean),
        disabled: !state.enabled,
        'data-laravel-blocks-heading-level-option': String(level),
        onClick: () => run('setHeading', { level }),
        onMousedown: (event) => event.preventDefault(),
        role: 'menuitemradio',
        title: state.disabledReason || `Heading ${level}`,
        type: 'button',
      }, `H${level}`);
    }

    function headingLevelGroup() {
      if (props.block.type !== 'heading') {
        return null;
      }

      const level = headingLevels.includes(Number(props.block.attrs?.level))
        ? Number(props.block.attrs.level)
        : 2;

      return h(ToolbarGroup, {
        class: 'lb-block-toolbar__heading-level-group',
        label: 'Heading level',
      }, {
        default: () => [
          h('button', {
            'aria-expanded': headingLevelOpen.value ? 'true' : 'false',
            'aria-haspopup': 'menu',
            class: 'lb-block-toolbar__heading-level',
            'data-laravel-blocks-heading-level': '',
            onClick: () => {
              headingLevelOpen.value = !headingLevelOpen.value;
              moreOpen.value = false;
              transformOpen.value = false;
              linkPopoverOpen.value = false;
              nextTick(updatePosition);
            },
            onMousedown: (event) => event.preventDefault(),
            title: `Heading ${level}`,
            type: 'button',
          }, `H${level}`),
          h('div', {
            class: 'lb-block-toolbar__transform-menu lb-block-toolbar__heading-menu',
            'data-laravel-blocks-heading-level-menu': '',
            hidden: !headingLevelOpen.value,
            role: 'menu',
          }, headingLevels.map(headingLevelOption)),
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

    function highlightButton() {
      const state = commandState(props.commandRegistry, 'toggleHighlight');

      return h(IconButton, {
        disabled: !state.enabled,
        label: 'Highlight',
        pressed: state.active,
        size: 'sm',
        title: state.disabledReason || 'Highlight',
        variant: state.active ? 'primary' : 'ghost',
        'data-laravel-blocks-block-command': 'toggleHighlight',
        'data-laravel-blocks-contextual-command': 'toggleHighlight',
        onClick: () => run('toggleHighlight'),
        onMousedown: (event) => event.preventDefault(),
      }, {
        default: () => h(Icon, {
          name: 'highlighter',
          size: 18,
        }),
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

    function inlineGroup() {
      return h(ToolbarGroup, {
        label: 'Inline formatting',
      }, {
        default: () => [
          boldButton(),
          italicButton(),
          highlightButton(),
          linkButton(),
        ],
      });
    }

    function moreGroup({ commands = hoverOptionCommands } = {}) {
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
              headingLevelOpen.value = false;
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
            ...commands.map(([command, label]) => option(command, label)),
          ]),
        ],
      });
    }

    function toolbarGroups() {
      return [
        transformGroup(),
        moveGroup(),
        headingLevelGroup(),
        inlineBlockTypes.has(props.block.type) ? inlineGroup() : null,
        moreGroup({ commands: hoverOptionCommands }),
      ].filter(Boolean);
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
        class: [
          'lb-ui-popover',
          'lb-block-toolbar',
          'lb-contextual-toolbar',
        ],
        'data-laravel-blocks-block-toolbar': '',
        'data-laravel-blocks-contextual-toolbar': '',
        'data-laravel-blocks-contextual-toolbar-mode': props.mode,
        hidden: toolbarHidden(),
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
      h(IconButton, {
        class: 'lb-block-hover-handle',
        'data-laravel-blocks-block-hover-handle': '',
        hidden: hidden() || props.mode !== 'handle',
        label: 'Open block toolbar',
        onClick: () => emit('requestBlockControls', props.block),
        onMousedown: (event) => event.preventDefault(),
        size: 'sm',
        style: handleStyle.value,
        title: 'Open block toolbar',
        variant: 'ghost',
      }, {
        default: () => h(Icon, {
          name: 'dragHandle',
          size: 18,
        }),
      }),
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
